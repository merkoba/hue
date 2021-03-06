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
  // Handles topic changes
  handler.public.change_topic = async function (socket, data) {
    if (!handler.is_admin_or_op(socket)) {
      return false
    }

    if (data.topic === undefined) {
      return false
    }

    if (data.topic.length === 0) {
      return false
    }

    if (data.topic.length > config.max_topic_length) {
      return false
    }

    if (data.topic !== utilz.clean_string2(data.topic)) {
      return false
    }

    let room = vars.rooms[socket.hue_room_id]

    if (data.topic === room.topic) {
      return false
    }

    let info = {}

    info.topic = data.topic

    db_manager.update_room(socket.hue_room_id, {
      topic: info.topic,
    })

    handler.room_emit(socket, "topic_changed", {
      topic: info.topic,
      username: socket.hue_username,
    })

    room.topic = info.topic

    handler.push_admin_log_message(
      socket,
      `changed the topic to "${info.topic}"`
    )
  }

  // Handles room name changes
  handler.public.change_room_name = async function (socket, data) {
    if (!handler.is_admin_or_op(socket)) {
      return false
    }

    if (
      data.name.length === 0 ||
      data.name.length > config.max_room_name_length
    ) {
      return false
    }

    if (data.name !== utilz.clean_string2(data.name)) {
      return false
    }

    let info = await db_manager.get_room(
      { _id: socket.hue_room_id },
      { name: 1 }
    )

    if (info.name !== data.name) {
      info.name = data.name

      handler.room_emit(socket, "room_name_changed", {
        name: info.name,
        username: socket.hue_username,
      })

      db_manager.update_room(info._id, {
        name: info.name,
      })

      vars.rooms[socket.hue_room_id].name = info.name

      handler.push_admin_log_message(
        socket,
        `changed the room name to "${info.name}"`
      )
    }
  }

  // Creates initial room objects
  handler.create_room_object = function (info) {
    let obj = {
      _id: info._id.toString(),
      activity: false,
      log_messages: info.log_messages,
      admin_log_messages: info.admin_log_messages,
      log_messages_modified: false,
      admin_log_messages_modified: false,
      userlist: {},
      stored_images: info.stored_images,
      current_image_id: info.image_id,
      current_image_user_id: info.image_user_id,
      current_image_source: info.image_source,
      current_image_query: info.image_query,
      current_tv_id: info.tv_id,
      current_tv_user_id: info.tv_user_id,
      current_tv_source: info.tv_source,
      current_tv_query: info.tv_query,
      topic: info.topic,
      name: info.name,
      public: info.public,
      modified: Date.now(),
      last_image_change: 0,
      last_tv_change: 0,
      message_board_posts: info.message_board_posts
    }

    return obj
  }
}
