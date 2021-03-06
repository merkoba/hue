module.exports = function (
  handler,
  vars,
  io,
  db_manager,
  config,
  sconfig,
  utilz,
  logger
) {
  // Handles chat messages
  handler.public.sendchat = function (socket, data) {
    if (data.message === undefined) {
      return false
    }

    if (data.message.length === 0) {
      return false
    }

    if (data.message.length > config.max_input_length) {
      return false
    }

    if (data.message.split("\n").length > config.max_num_newlines) {
      return false
    }

    handler.process_message_links(data.message, function (response) {
      let id
      let date
      let edited
      let uname
      let pfimage = socket.hue_profile_image

      if (data.edit_id) {
        let messages = vars.rooms[socket.hue_room_id].log_messages

        for (let i = 0; i < messages.length; i++) {
          let message = messages[i]

          if (message.type !== "chat") {
            continue
          }

          if (message.id === data.edit_id) {
            if (message.data.user_id === socket.hue_user_id) {
              message.data.content = data.message
              message.data.edited = true
              uname = message.data.username
              date = message.date
              edited = true
              vars.rooms[socket.hue_room_id].log_messages_modified = true
              vars.rooms[socket.hue_room_id].activity = true
              break
            } else {
              return false
            }
          }
        }

        if (!edited) {
          return false
        }

        id = data.edit_id
        edited = true
      } else {
        date = Date.now()
        id = handler.generate_message_id()
        uname = socket.hue_username
        edited = false
      }

      handler.room_emit(socket, "chat_message", {
        id: id,
        user_id: socket.hue_user_id,
        username: uname,
        message: data.message,
        profile_image: pfimage,
        date: date,
        link_title: response.title,
        link_description: response.description,
        link_image: response.image,
        link_url: response.url,
        edited: edited,
        just_edited: edited,
      })

      if (!data.edit_id) {
        let message = {
          id: id,
          type: "chat",
          date: date,
          data: {
            user_id: socket.hue_user_id,
            username: uname,
            content: data.message,
            profile_image: pfimage,
            link_title: response.title,
            link_description: response.description,
            link_image: response.image,
            link_url: response.url,
            edited: edited,
          }
        }

        handler.push_log_message(socket, message)
      }

      vars.rooms[socket.hue_room_id].modified = Date.now()
    })
  }

  // Handles typing signals
  handler.public.typing = async function (socket, data) {
    socket.hue_typing_counter += 1

    if (socket.hue_typing_counter >= 50) {
      let spam_ans = await handler.add_spam(socket)

      if (!spam_ans) {
        return false
      }

      socket.hue_typing_counter = 0
    }

    handler.broadcast_emit(socket, "typing", { user_id: socket.hue_user_id })
  }

  // Generates IDs for messages
  handler.generate_message_id = function () {
    return `${Date.now()}_${utilz.random_sequence(3)}`
  }

  // Deletes a message
  handler.public.delete_message = async function (socket, data) {
    if (!data.id) {
      return false
    }

    let room = vars.rooms[socket.hue_room_id]
    let messages = room.log_messages
    let message
    let message_id
    let message_user_id
    let message_index
    let message_type
    let message_username
    let deleted = false

    for (let i = 0; i < messages.length; i++) {
      let msg = messages[i]

      if (msg.id && msg.id == data.id) {
        message = msg
        message_index = i
        message_type = msg.type
        message_id = msg.id
        message_user_id = msg.data.user_id
        break
      }
    }

    if (message) {
      if (!message.data.user_id) {
        if (!handler.is_admin_or_op(socket)) {
          return false
        }

        deleted = true
        messages.splice(message_index, 1)
      } else if (message.data.user_id !== socket.hue_user_id) {
        if (!handler.is_admin_or_op(socket)) {
          return false
        }

        let info = await db_manager.get_room(
          { _id: socket.hue_room_id },
          { keys: 1 }
        )
        let userinfo = await db_manager.get_user(
          { _id: message.data.user_id },
          { username: 1 }
        )

        if (!userinfo) {
          handler.user_emit(socket, "user_not_found", {})
          return false
        }

        let id = userinfo._id.toString()
        let current_role = info.keys[id] || vars.default_role
        message_username = userinfo.username

        if (!socket.hue_superuser) {
          if (
            (current_role === "admin" || current_role === "op") &&
            socket.hue_role !== "admin"
          ) {
            handler.user_emit(socket, "forbidden_user", {})
            return false
          }
        }

        for (let i = 0; i < messages.length; i++) {
          let msg = messages[i]

          if (msg.id && msg.id == data.id) {
            deleted = true
            messages.splice(i, 1)
            break
          }
        }
      } else {
        deleted = true
        messages.splice(message_index, 1)
      }

      if (deleted) {
        handler.room_emit(socket, "message_deleted", {
          id: message_id,
          type: message_type,
        })

        if (
          message_type === "image" ||
          message_type === "tv"
        ) {
          if (room[`current_${message_type}_id`] === message_id) {
            handler[`do_change_${message_type}`](socket, {
              src: "",
              setter: "",
            })
          }
        }

        if (message_user_id !== socket.hue_user_id && message_username) {
          if (message_type === "chat") {
            handler.push_admin_log_message(
              socket,
              `deleted a chat message from "${message_username}"`
            )
          } else if (
            message_type === "image" ||
            message_type === "tv"
          ) {
            let a = "a"

            if (message_type === "image") {
              a = "an"
            }

            let s = `deleted ${a} ${message_type} change from "${message_username}"`
            handler.push_admin_log_message(socket, s)
          }
        }
      }
    }
  }
}
