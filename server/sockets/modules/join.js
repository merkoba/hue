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
  // Sets initial hue_* variables on connection
  handler.connection = function (socket) {
    socket.hue_pinged = false
    socket.hue_kicked = false
    socket.hue_banned = false
    socket.hue_joining = false
    socket.hue_joined = false
    socket.hue_superuser = false
    socket.hue_locked = false
    socket.hue_info1 = ""
    socket.hue_typing_counter = 0
    socket.hue_activity_counter = 0
    socket.hue_last_badge_date = Date.now()
  }

  // Attempts to join a room
  handler.public.join_room = async function (socket, data) {
    if (socket.hue_joining || socket.hue_joined) {
      return false
    }

    if (data.room_id === undefined) {
      return handler.do_disconnect(socket)
    }

    if (data.room_id.length > config.max_room_id_length) {
      return handler.do_disconnect(socket)
    }

    if (data.alternative) {
      socket.hue_login_method = "alternative"
      data.email = data.email.trim()
      data.password = data.password.trim()

      if (data.email === undefined || data.password === undefined) {
        return handler.do_disconnect(socket)
      }

      if (data.email > config.max_max_email_length) {
        return handler.do_disconnect(socket)
      }

      if (data.password.length > config.max_max_password_length) {
        return handler.do_disconnect(socket)
      }
    } else {
      socket.hue_login_method = "normal"
      data.user_id = data.user_id.trim()

      if (data.user_id === undefined || data.token === undefined) {
        return handler.do_disconnect(socket)
      }

      if (data.user_id > config.max_user_id_length) {
        return handler.do_disconnect(socket)
      }

      if (data.token.length > config.max_jwt_token_length) {
        return handler.do_disconnect(socket)
      }
    }

    let room_fields = {}

    if (vars.rooms[data.room_id]) {
      room_fields = vars.filtered_fields
    }

    let user_fields = {
      email: 1,
      username: 1,
      profile_image: 1,
      profile_image_version: 1,
      registration_date: 1,
      bio: 1,
      hearts: 1,
      skulls: 1,
      audio_clip: 1,
      audio_clip_version: 1,
    }

    if (data.alternative) {
      let ans = await db_manager.check_password(
        data.email,
        data.password,
        user_fields
      )

      if (!ans.valid) {
        return handler.do_disconnect(socket)
      }

      let userinfo = ans.user

      socket.hue_user_id = userinfo._id.toString()

      let info = await db_manager.get_room({ _id: data.room_id }, room_fields)

      if (!info) {
        return handler.do_disconnect(socket)
      }

      handler.do_join(socket, info, userinfo, data)
    } else {
      vars.jwt.verify(data.token, sconfig.jwt_secret, async function (
        err,
        decoded
      ) {
        if (err) {
          return handler.do_disconnect(socket)
        } else if (
          decoded.data === undefined ||
          decoded.data.id === undefined
        ) {
          return handler.do_disconnect(socket)
        }

        if (decoded.data.id !== data.user_id) {
          return handler.do_disconnect(socket)
        } else {
          socket.hue_user_id = data.user_id

          let info = await db_manager.get_room(
            { _id: data.room_id },
            room_fields
          )

          if (!info) {
            return handler.do_disconnect(socket)
          }

          let userinfo = await db_manager.get_user(
            { _id: socket.hue_user_id },
            user_fields
          )

          if (!userinfo) {
            return handler.do_disconnect(socket)
          }

          handler.do_join(socket, info, userinfo, data)
        }
      })
    }
  }

  // Does a room join after successful authentication
  handler.do_join = async function (socket, info, userinfo, data) {
    socket.hue_room_id = info._id.toString()
    socket.hue_email = userinfo.email
    socket.hue_bio = userinfo.bio
    socket.hue_hearts = userinfo.hearts
    socket.hue_skulls = userinfo.skulls
    socket.hue_joining = true

    socket.join(socket.hue_room_id)

    if (handler.check_multipe_joins(socket)) {
      return handler.do_disconnect(socket)
    }

    if (handler.check_socket_limit(socket)) {
      return handler.do_disconnect(socket)
    }

    if (sconfig.superuser_emails.includes(userinfo.email)) {
      socket.hue_superuser = true
    }

    socket.hue_username = userinfo.username

    socket.hue_ip =
      socket.client.request.headers["x-forwarded-for"] ||
      socket.client.conn.remoteAddress

    if (!socket.hue_superuser && info.bans.includes(socket.hue_user_id)) {
      socket.leave(socket.hue_room_id)
      socket.hue_locked = true

      handler.user_emit(socket, "joined", {
        room_locked: true,
      })

      return false
    }

    if (userinfo.profile_image === "") {
      socket.hue_profile_image = ""
    } else {
      socket.hue_profile_image =
        config.public_images_location + userinfo.profile_image
    }

    if (
      socket.hue_profile_image &&
      !socket.hue_profile_image.includes("?ver=")
    ) {
      socket.hue_profile_image += `?ver=${userinfo.profile_image_version}`
    }

    if (userinfo.audio_clip === "") {
      socket.hue_audio_clip = ""
    } else {
      socket.hue_audio_clip = config.public_audio_location + userinfo.audio_clip
    }

    if (socket.hue_audio_clip && !socket.hue_audio_clip.includes("?ver=")) {
      socket.hue_audio_clip += `?ver=${userinfo.audio_clip_version}`
    }

    let background_image

    if (info.background_image === "") {
      background_image = ""
    } else if (info.background_image_type === "hosted") {
      background_image = config.public_images_location + info.background_image
    } else {
      background_image = info.background_image
    }

    if (vars.rooms[socket.hue_room_id] === undefined) {
      let key = Object.keys(vars.filtered_fields)[0]

      if (info[key] === undefined) {
        info = await db_manager.get_room({ _id: socket.hue_room_id }, {})
      }

      vars.rooms[socket.hue_room_id] = handler.create_room_object(info)
    }

    socket.hue_role = info.keys[socket.hue_user_id] || vars.default_role

    if (!vars.roles.includes(socket.hue_role)) {
      socket.hue_role = "voice"
    }

    if (vars.user_rooms[socket.hue_user_id] === undefined) {
      vars.user_rooms[socket.hue_user_id] = []
    }

    if (!vars.user_rooms[socket.hue_user_id].includes(socket.hue_room_id)) {
      vars.user_rooms[socket.hue_user_id].push(socket.hue_room_id)
    }

    let already_connected = handler.user_already_connected(socket)

    if (!already_connected) {
      vars.rooms[socket.hue_room_id].userlist[socket.hue_user_id] = {}
      handler.update_user_in_userlist(socket, true)
    }

    socket.hue_joining = false
    socket.hue_joined = true

    let user_data = {
      room_locked: false,
      room_name: info.name,
      username: socket.hue_username,
      topic: info.topic,
      userlist: handler.prepare_userlist(
        handler.get_userlist(socket.hue_room_id)
      ),
      role: socket.hue_role,
      image_id: info.image_id,
      image_user_id: info.image_user_id,
      image_comment: info.image_comment,
      image_type: info.image_type,
      image_source: info.image_source,
      image_setter: info.image_setter,
      image_size: info.image_size,
      image_date: info.image_date,
      image_query: info.image_query,
      tv_id: info.tv_id,
      tv_user_id: info.tv_user_id,
      tv_comment: info.tv_comment,
      tv_type: info.tv_type,
      tv_source: info.tv_source,
      tv_title: info.tv_title,
      tv_setter: info.tv_setter,
      tv_date: info.tv_date,
      tv_query: info.tv_query,
      profile_image: socket.hue_profile_image,
      background_color: info.background_color,
      background_image: background_image,
      text_color: info.text_color,
      email: utilz.conceal_email(socket.hue_email),
      bio: socket.hue_bio,
      superuser:socket.hue_superuser,
      reg_date: userinfo.registration_date,
    }

    if (data.no_message_log) {
      user_data.log_messages = []
      user_data.message_board_posts = []
    } else {
      user_data.log_messages = vars.rooms[socket.hue_room_id].log_messages
      user_data.message_board_posts =
        vars.rooms[socket.hue_room_id].message_board_posts
    }

    handler.user_emit(socket, "joined", user_data)

    if (!already_connected) {
      handler.broadcast_emit(socket, "user_joined", {
        user_id: socket.hue_user_id,
        username: socket.hue_username,
        role: socket.hue_role,
        profile_image: socket.hue_profile_image,
        bio: socket.hue_bio,
        hearts: socket.hue_hearts,
        skulls: socket.hue_skulls,
        audio_clip: socket.hue_audio_clip,
        date_joined: Date.now(),
      })
    }
  }
}
