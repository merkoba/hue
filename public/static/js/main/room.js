// Gets the room state localStorage object
Hue.get_room_state = function () {
  let room_state_all = Hue.get_local_storage(Hue.ls_room_state)

  if (room_state_all === null) {
    room_state_all = {}
  }

  Hue.room_state = room_state_all[Hue.room_id]

  if (Hue.room_state === undefined) {
    Hue.room_state = {}
  }

  let changed = false

  let settings = [
    "image_enabled",
    "tv_enabled",
    "last_highlight_date",
    "chat_display_percentage",
    "tv_display_percentage",
    "tv_display_position",
    "media_layout",
    "last_message_board_post"
  ]

  for (let setting of settings) {
    if (Hue.room_state[setting] === undefined) {
      Hue.room_state[setting] = Hue.config[`room_state_default_${setting}`]
      changed = true
    }
  }

  if (changed) {
    Hue.save_room_state()
  }
}

// Saves the room state localStorage object
Hue.save_room_state = function () {
  let room_state_all = Hue.get_local_storage(Hue.ls_room_state)

  if (room_state_all === null) {
    room_state_all = {}
  }

  room_state_all[Hue.room_id] = Hue.room_state
  Hue.save_local_storage(Hue.ls_room_state, room_state_all)
}

// Show the room name
Hue.show_room_name = function () {
  Hue.feedback(`Room: ${Hue.room_name}`)
}

// Change the name of the room
Hue.change_room_name = function (arg) {
  if (!Hue.is_admin_or_op(Hue.role)) {
    return false
  }

  arg = Hue.utilz.clean_string2(
    arg.substring(0, Hue.config.max_room_name_length)
  )

  if (arg === Hue.room_name) {
    Hue.feedback("That's already the room name")
    return
  }

  if (arg.length > 0) {
    Hue.socket_emit("change_room_name", { name: arg })
  }
}

// Gets the topic
Hue.get_topic = function () {
  if (Hue.topic) {
    return Hue.topic
  } else {
    return Hue.config.default_topic
  }
}

// Shows the topic
Hue.show_topic = function () {
  let topic = `Topic: ${Hue.get_topic()}`
  let obj = {}

  Hue.feedback(topic, obj)
}

// Announces room name changes
Hue.announce_room_name_change = function (data) {
  if (data.name !== Hue.room_name) {
    Hue.show_room_notification(
      data.username,
      `${data.username} changed the room name`
    )

    Hue.set_room_name(data.name)
    Hue.update_title()
    Hue.update_input_placeholder()
  }
}

// Room name setter
Hue.set_room_name = function (name) {
  Hue.room_name = name
  Hue.config_admin_room_name()
}

// Changes the topic
Hue.change_topic = function (dtopic) {
  if (!Hue.is_admin_or_op(Hue.role)) {
    return false
  }

  dtopic = Hue.utilz.clean_string2(
    dtopic.substring(0, Hue.config.max_topic_length)
  )

  if (dtopic.length > 0) {
    if (Hue.topic !== dtopic) {
      Hue.socket_emit("change_topic", { topic: dtopic })
    } else {
      Hue.feedback("Topic is already set to that")
    }
  }
}

// Announces topic changes
Hue.announce_topic_change = function (data) {
  if (data.topic !== Hue.topic) {
    Hue.show_room_notification(
      data.username,
      `${data.username} changed the topic`
    )

    Hue.set_topic_info(data)
    Hue.update_title()
  }
}

// Sets topic data with received data
Hue.set_topic_info = function (data) {
  if (!data) {
    data = {}
    data.topic = ""
  }

  Hue.topic = data.topic
  Hue.config_admin_topic()
}

// Requests the admin activity list from the server
Hue.request_admin_activity = function (filter = "") {
  if (!Hue.is_admin_or_op(Hue.role)) {
    Hue.not_an_op()
    return false
  }

  Hue.admin_activity_filter_string = filter

  Hue.socket_emit("get_admin_activity", {})
}

// Shows the admin activity list
Hue.show_admin_activity = function (messages) {
  $("#admin_activity_container").html("")

  Hue.msg_admin_activity.show(function () {
    for (let message of messages) {
      let nice_date = Hue.utilz.nice_date(message.date)

      let el = $(`
            <div class='modal_item admin_activity_item dynamic_title' title='${nice_date}'>
                <div class='admin_activity_message'></div>
                <div class='admin_activity_date'></div>
            </div>`)

      el.find(".admin_activity_message")
        .eq(0)
        .text(`${message.data.username} ${message.data.content}`)
      el.find(".admin_activity_date").eq(0).text(nice_date)

      el.data("date", message.date)
      el.data("otitle", nice_date)

      $("#admin_activity_container").prepend(el)
    }

    $("#admin_activity_filter").val(Hue.admin_activity_filter_string)

    Hue.do_modal_filter()
  })
}

// Requests the admin list
Hue.request_admin_list = function () {
  if (!Hue.is_admin_or_op(Hue.role)) {
    Hue.not_an_op()
    return false
  }

  Hue.socket_emit("get_admin_list", {})
}

// Shows the admin list
Hue.show_admin_list = function (data) {
  let s = $("<div id='admin_list_container' class='grid_column_center'></div>")

  data.list.sort(Hue.compare_userlist)

  for (let user of data.list) {
    let hs =
      "<div class='flex_row_center'><div class='admin_list_username'></div>&nbsp;&nbsp;<div class='admin_list_role'></div></div>"
    let h = $(`<div class='admin_list_item action'>${hs}</div>`)

    h.find(".admin_list_username").eq(0).text(user.username)
    h.find(".admin_list_role")
      .eq(0)
      .text(`(${Hue.get_pretty_role_name(user.role)})`)

    h.on("click", function () {
      Hue.show_profile(user.username)
    })

    s.append(h)
  }

  Hue.msg_info2.show([`Admin List (${data.list.length})`, s[0]], function () {
    Hue.admin_list_open = true
  })
}

// Requests the ban list
Hue.request_ban_list = function () {
  if (!Hue.is_admin_or_op(Hue.role)) {
    Hue.not_an_op()
    return false
  }

  Hue.socket_emit("get_ban_list", {})
}

// Shows the ban list
Hue.show_ban_list = function (data) {
  let s = $("<div id='ban_list_container' class='grid_column_center'></div>")

  for (let user of data.list) {
    let hs =
      "<div class='flex_row_center'><div class='ban_list_username' title='Click To Unban'></div></div>"
    let h = $(`<div class='ban_list_item action'>${hs}</div>`)

    h.find(".ban_list_username").eq(0).text(user.username)

    h.on("click", function () {
      Hue.show_confirm(`Unban ${user.username}`, "", function () {
        Hue.unban(user.username)
      })
    })

    s.append(h)
  }

  Hue.msg_info2.show([`Ban List (${data.list.length})`, s[0]], function () {
    Hue.ban_list_open = true
  })
}