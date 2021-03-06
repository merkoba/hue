// Sets events for all context menus
Hue.context_menu_events = {
  show: function () {
    Hue.context_menu_on_show()
  },
  hide: function () {
    Hue.context_menu_on_hide()
  },
}

// What happens after opening a context menu
Hue.context_menu_on_show = function () {
  Hue.context_menu_open = true
}

// What happens after hiding a context menu
Hue.context_menu_on_hide = function () {
  Hue.context_menu_open = false
}

// Starts the context menu for chat items
// This is triggered by a normal click
Hue.start_chat_menu_context_menu = function () {
  $.contextMenu({
    selector: ".chat_menu_button_menu",
    trigger: "left",
    animation: { duration: 250, hide: "fadeOut" },
    zIndex: 9000000000,
    events: Hue.context_menu_events,
    items: {
      item0: {
        name: "Jump",
        callback: function (key, opt) {
          let message_id = $(this).closest(".message").data("message_id")
          Hue.jump_to_chat_message(message_id)
        },
        visible: function (key, opt) {
          return $(this).closest("#chat_area").length === 0
        },
      },
      item1: {
        name: "Reply",
        callback: function (key, opt) {
          let el = $(this)
            .closest(".reply_message_container")
            .eq(0)
            .find(".reply_message")
            .get(0)
          Hue.start_reply(el)
        },
        visible: function (key, opt) {
          let message = $(this).closest(".message")
          let mode = message.data("mode")

          if (mode === "chat") {
            return true
          } else if (mode === "announcement") {
            let type = message.data("type")
            if (type === "image_change" || type === "tv_change") {
              return true
            }
          }

          return false
        },
      },
      item2: {
        name: "Edit",
        callback: function (key, opt) {
          let el = $(this).closest(".chat_content_container").get(0)
          Hue.edit_message(el)
        },
        visible: function (key, opt) {
          let message = $(this).closest(".message")

          if (message.data("mode") === "chat") {
            if ($(this).closest(".message").data("user_id") === Hue.user_id) {
              return true
            }
          }

          return false
        },
      },
      item4: {
        name: "Change Image",
        callback: function (key, opt) {
          let el = this

          Hue.show_confirm("Change Image", "This will change it for everyone", function () {
            let first_url = $(el)
            .closest(".chat_content_container")
            .data("first_url")

            Hue.change_image_source(first_url)
          })
        },
        visible: function (key, opt) {
          let url = $(this).closest(".chat_content_container").data("first_url")

          if (url) {
            let ok = Hue.change_image_source(url, true)

            if (ok) {
              return true
            }
          }

          return false
        },
      },
      item5: {
        name: "Change TV",
        callback: function (key, opt) {
          let el = this

          Hue.show_confirm("Change TV", "This will change it for everyone", function () {
            let first_url = $(el)
            .closest(".chat_content_container")
            .data("first_url")

            Hue.change_tv_source(first_url)
          })
        },
        visible: function (key, opt) {
          let url = $(this).closest(".chat_content_container").data("first_url")

          if (url) {
            let ok = Hue.change_tv_source(url, true)

            if (ok) {
              return true
            }
          }

          return false
        },
      },
      item7: {
        name: "Hide",
        callback: function (key, opt) {
          let el = this

          Hue.show_confirm("Hide Message", "This won't delete it", function () {
            Hue.remove_message_from_context_menu(el)
          })
        },
      },
      itemdel: {
        name: "Delete",
        callback: function (key, opt) {
          let el = this

          Hue.show_confirm("Delete Message", "Remove message from the chat log", function () {
            let id = false
            let message = $(el).closest(".message")
            let mode = message.data("mode")

            if (mode === "chat") {
              id = $(el).closest(".chat_content_container").eq(0).data("id")
            } else if (mode === "announcement") {
              id = message.data("id")
            }

            if (id) {
              Hue.delete_message(id, true)
            }
          })
        },
        visible: function (key, opt) {
          let message = $(this).closest(".message")
          let mode = message.data("mode")

          if (mode === "chat") {
            let user_id = $(this).closest(".message").data("user_id")

            if (user_id) {
              let user = Hue.get_user_by_user_id(user_id)

              if (user) {
                if (!Hue.user_is_controllable(user)) {
                  return false
                }
              }
            }

            if ((user_id && user_id === Hue.user_id) || Hue.is_admin_or_op()) {
              return true
            }
          } else if (mode === "announcement") {
            let id = message.data("id")

            if (id) {
              let user_id = message.data("user_id")

              if (user_id) {
                let user = Hue.get_user_by_user_id(user_id)

                if (user) {
                  if (!Hue.user_is_controllable(user)) {
                    return false
                  }
                }
              }

              if (
                (user_id && user_id === Hue.user_id) ||
                Hue.is_admin_or_op()
              ) {
                return true
              }
            }
          }

          return false
        },
      },
    },
  })
}

// Starts the context menu on user elements
Hue.start_user_context_menu = function () {
  $.contextMenu({
    selector: "#show_profile_user",
    trigger: "left",
    animation: { duration: 250, hide: "fadeOut" },
    zIndex: 9000000000,
    events: Hue.context_menu_events,
    items: {
      d1: {
        name: "Voice",
        callback: function (key, opt) {
          let el = this

          Hue.show_confirm("Give Voice Role", "Can interact with users and change media but no operator abilities", function () {
            let arg = el.data("username")
            Hue.change_role(arg, "voice")
          })
        },
        visible: function (key, opt) {
          if (!Hue.is_admin_or_op(Hue.role)) {
            return false
          } else {
            return true
          }
        },
      },
      cmop1: {
        name: "Op",
        callback: function (key, opt) {
          let el = this

          Hue.show_confirm("Give Op Role", "Enables access to operator features and commands", function () {
            let arg = el.data("username")
            Hue.change_role(arg, "op")
          })
        },
        visible: function (key, opt) {
          if (!Hue.is_admin_or_op(Hue.role)) {
            return false
          } else {
            return true
          }
        },
      },
      cmadmin: {
        name: "Admin",
        callback: function (key, opt) {
          let el = this

          Hue.show_confirm("Give Admin Role", "Operator abilities plus can add/remove operators ", function () {
            let arg = el.data("username")
            Hue.change_role(arg, "admin")
          })
        },
        visible: function (key, opt) {
          if (!Hue.is_admin_or_op(Hue.role)) {
            return false
          } else {
            return true
          }
        },
      },
      cmkick: {
        name: "Kick",
        callback: function (key, opt) {
          let el = this

          Hue.show_confirm("Kick User", "Disconnect the user from the room", function () {
            let arg = el.data("username")
            Hue.kick(arg)
          })
        },
        visible: function (key, opt) {
          if (!Hue.is_admin_or_op(Hue.role)) {
            return false
          } else {
            let username = this.data("username")
            return Hue.user_is_online_by_username(username)
          }
        },
      },
      cmban: {
        name: "Ban",
        callback: function (key, opt) {
          let el = this

          Hue.show_confirm("Ban User", "Ban the user from joining the room", function () {
            let arg = el.data("username")
            Hue.ban(arg)
          })
        },
        visible: function (key, opt) {
          if (!Hue.is_admin_or_op(Hue.role)) {
            return false
          } else {
            return true
          }
        },
      },
      cmvoiced: {
        name: "---",
        visible: function (key, opt) {
          if (!Hue.is_admin_or_op(Hue.role)) {
            return true
          } else {
            return false
          }
        },
      },
    },
  })
}

// Starts the context menu for modal and popup windows's close buttons
Hue.start_msg_close_buttons_context_menu = function () {
  $.contextMenu({
    selector: ".Msg-window-inner-x",
    animation: { duration: 250, hide: "fadeOut" },
    zIndex: 9000000000,
    events: Hue.context_menu_events,
    items: {
      mm0: {
        name: "Close All",
        callback: function (key, opt) {
          Hue.process_msg_close_button(this)
        },
      },
    },
  })
}