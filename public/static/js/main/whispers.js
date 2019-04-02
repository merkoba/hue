// Checks if a user is in the room to receive a whisper
Hue.check_whisper_user = function(uname)
{
    if(!Hue.can_chat)
    {
        Hue.cant_chat()
        return false
    }

    if(!Hue.usernames.includes(uname))
    {
        Hue.user_not_in_room(uname)
        return false
    }

    return true
}

// Processes whisper commands to determine how to handle the operation
Hue.process_write_whisper = function(arg, show=true)
{
    let user = Hue.get_user_by_username(arg)

    if(arg.includes(">"))
    {
        Hue.send_inline_whisper(arg, show)
    }

    else if(user)
    {
        Hue.write_popup_message([arg], "user")
    }

    else if(arg.includes("&&"))
    {
        let split = arg.split("&&").map(x => x.trim())
        Hue.write_popup_message(split, "user")
    }

    else
    {
        let matches = Hue.get_matching_usernames(arg)

        if(matches.length === 1)
        {
            let message = arg.replace(matches[0], "")
            let arg2 = `${matches[0]} > ${message}`

            Hue.send_inline_whisper(arg2, show)
        }

        else if(matches.length > 1)
        {
            Hue.feedback("Multiple usernames matched. Use the proper > syntax. For example /whisper bob > hi")
            return false
        }

        else
        {
            Hue.user_not_in_room()
            return false
        }
    }
}

// Sends a whisper using the inline format (/whisper user > hello)
Hue.send_inline_whisper = function(arg, show=true)
{
    let split = arg.split(">")

    if(split.length < 2)
    {
        return false
    }

    let uname = split[0].trim()
    let usplit = uname.split("&&")
    let message = Hue.utilz.clean_string10(Hue.utilz.clean_multiline(split.slice(1).join(">")))

    if(!message)
    {
        return false
    }

    let message_split = message.split("\n")
    let num_lines = message_split.length

    if(num_lines > Hue.config.max_num_newlines)
    {
        return false
    }

    let approved = []

    for(let u of usplit)
    {
        u = u.trim()

        if(!Hue.check_whisper_user(u))
        {
            continue
        }

        approved.push(u)
    }

    if(approved.length === 0)
    {
        return false
    }

    Hue.do_send_whisper_user(approved, message, false, show)
}

// Shows the window to write whispers
// Handles different whisper types
Hue.write_popup_message = function(unames=[], type="user")
{
    let title

    if(type === "user")
    {
        for(let u of unames)
        {
            if(!Hue.check_whisper_user(u))
            {
                return false
            }
        }

        let f = function()
        {
            Hue.show_userlist_window("whisper")
        }

        title = {text:`Whisper to ${Hue.utilz.nice_list(unames)}`, onclick:f}
    }

    else if(type === "ops")
    {
        if(!Hue.is_admin_or_op(Hue.role))
        {
            Hue.not_an_op()
            return false
        }

        title = {text:"* Whisper to Operators *"}
    }

    else if(type === "room")
    {
        if(!Hue.is_admin_or_op(Hue.role))
        {
            Hue.not_an_op()
            return false
        }

        title = {text:"* Message To Room *"}
    }

    else if(type === "system")
    {
        title = {text:"* Message To System *"}
    }

    Hue.message_unames = unames
    Hue.message_type = type
    Hue.msg_message.set_title(Hue.make_safe(title))

    Hue.msg_message.show(function()
    {
        $("#write_message_area").focus()
        Hue.sending_whisper = false
    })
}

// Updates the user receivers in the whisper window after picking a username in the user list
Hue.update_whisper_users = function(uname)
{
    if(!Hue.message_unames.includes(uname))
    {
        Hue.message_unames.push(uname)
    }

    else
    {
        if(Hue.message_unames.length === 1)
        {
            return false
        }

        for(let i=0; i<Hue.message_unames.length; i++)
        {
            let u = Hue.message_unames[i]

            if(u === uname)
            {
                Hue.message_unames.splice(i, 1)
                break
            }
        }
    }

    let f = function()
    {
        Hue.show_userlist_window("whisper")
    }

    let title = {text:`Whisper to ${Hue.utilz.nice_list(Hue.message_unames)}`, onclick:f}

    Hue.msg_message.set_title(Hue.make_safe(title))
    Hue.msg_userlist.close()
}

// Submits the whisper window form
// Handles different types of whispers
// Includes text and drawings
Hue.send_popup_message = function(force=false)
{
    if(Hue.sending_whisper)
    {
        return false
    }

    Hue.sending_whisper = true

    let message = Hue.utilz.clean_string10($("#write_message_area").val())
    let diff = Hue.config.max_input_length - message.length
    let draw_coords

    if(Hue.draw_message_click_x.length > 0)
    {
        draw_coords = [Hue.draw_message_click_x, Hue.draw_message_click_y, Hue.draw_message_drag]
    }

    else
    {
        draw_coords = false
    }

    if(diff === Hue.config.max_input_length)
    {
        if(!draw_coords)
        {
            Hue.sending_whisper = false
            return false
        }
    }

    else if(diff < 0)
    {
        $("#write_message_feedback").text(`Character limit exceeded by ${Math.abs(diff)}`)
        $("#write_message_feedback").css("display", "block")
        Hue.sending_whisper = false
        return false
    }

    let message_split = message.split("\n")
    let num_lines = message_split.length

    if(num_lines > Hue.config.max_num_newlines)
    {
        $("#write_message_feedback").text(`Too many linebreaks`)
        $("#write_message_feedback").css("display", "block")
        Hue.sending_whisper = false
        return false
    }

    let ans

    if(Hue.message_type === "user")
    {
        ans = Hue.send_whisper_user(message, draw_coords, force)
    }

    else if(Hue.message_type === "ops")
    {
        ans = Hue.send_whisper_ops(message, draw_coords)
    }

    else if(Hue.message_type === "room")
    {
        ans = Hue.send_room_broadcast(message, draw_coords)
    }

    else if(Hue.message_type === "system")
    {
        ans = Hue.send_system_broadcast(message, draw_coords)
    }

    if(ans)
    {
        Hue.msg_message.close(function()
        {
            Hue.sending_whisper = false
        })
    }

    else
    {
        Hue.sending_whisper = false
    }
}

// Confirmation when a whisper was sent
// Configured to recreate the whisper when clicked
Hue.sent_popup_message_function = function(mode, message, draw_coords, data1=[])
{
    let cf = function(){}
    let ff = function(){}
    let s1, s2

    if(mode === "whisper")
    {
        s1 = Hue.utilz.nonbreak("Send Another Whisper")
        s2 = `Whisper sent to ${Hue.utilz.nice_list(data1)}`

        cf = function()
        {
            Hue.write_popup_message(data1)
        }

        ff = function()
        {
            Hue.show_profile(data1[0])
        }
    }

    else
    {
        return false
    }

    let h = `<div class='small_button action' id='modal_popup_feedback_send'>${s1}</div>`
    let ch

    if(draw_coords)
    {
        ch = "<canvas id='modal_popup_feedback_draw' class='draw_canvas' width='400px' height='300px' tabindex=1></canvas>"
    }

    else
    {
        ch = ""
    }

    if(ch)
    {
        h = ch + sp + h
    }

    let s = Hue.make_safe(
    {
        text: message,
        html: h,
        remove_text_if_empty: true,
        date: Date.now()
    })

    let f = function()
    {
        Hue.msg_info2.show([Hue.make_safe({text:s2, onclick:ff}), s], function()
        {
            $("#modal_popup_feedback_send").click(cf)

            if(draw_coords)
            {
                let context = $("#modal_popup_feedback_draw")[0].getContext("2d")

                Hue.canvas_redraw
                ({
                    context: context,
                    click_x: draw_coords[0],
                    click_y: draw_coords[1],
                    drag: draw_coords[2]
                })
            }
        })
    }

    return f
}

// Sends a whisper to user(s)
Hue.send_whisper_user = function(message, draw_coords, force=false)
{
    let unames = Hue.message_unames

    if(!unames)
    {
        return false
    }

    if(!Hue.can_chat)
    {
        $("#write_message_feedback").text("You don't have chat permission")
        $("#write_message_feedback").css("display", "block")

        return false
    }

    let discarded = []
    let approved = []

    for(let u of unames)
    {
        if(!Hue.usernames.includes(u))
        {
            discarded.push(u)
        }

        else
        {
            approved.push(u)
        }
    }

    if(!force)
    {
        if(discarded.length > 0)
        {
            let us = Hue.utilz.nice_list(discarded)
            let w = discarded.length === 1 ? "is" : "are"
            let dd = ""

            if(unames.length > discarded.length)
            {
                dd = " Double click Send to send anyway"
            }

            $("#write_message_feedback").text(`(${us} ${w} not in the room)${dd}`)
            $("#write_message_feedback").css("display", "block")

            return false
        }
    }

    if(approved.length === 0)
    {
        return false
    }

    Hue.do_send_whisper_user(approved, message, draw_coords)

    return true
}

// Does the whisper of type user emit
Hue.do_send_whisper_user = function(unames, message, draw_coords, show=true)
{
    for(let u of unames)
    {
        Hue.socket_emit('whisper',
        {
            type: "user",
            username: u,
            message: message,
            draw_coords: draw_coords
        })
    }

    if(show)
    {
        let f = Hue.sent_popup_message_function("whisper", message, draw_coords, unames)
        let m = `Whisper sent to ${Hue.utilz.nice_list(unames)}`

        Hue.feedback(m, {onclick:f, save:true})
    }
}

// Does the whisper of type operators emit
Hue.send_whisper_ops = function(message, draw_coords)
{
    Hue.socket_emit('whisper', {type:"ops", message:message, draw_coords:draw_coords})
    return true
}

// Does the whisper of type room broadcast emit
Hue.send_room_broadcast = function(message, draw_coords)
{
    if(!Hue.is_admin_or_op(Hue.role))
    {
        Hue.not_an_op()
        return false
    }

    Hue.socket_emit("whisper", {type:"broadcast", message:message, draw_coords:draw_coords})
    return true
}

// Does the whisper of type system broadcast emit
Hue.send_system_broadcast = function(message, draw_coords)
{
    Hue.socket_emit("whisper", {type:"system_broadcast", message:message, draw_coords:draw_coords})
    return true
}

// When receiving a whisper
// A popup automatically appears unless configured not to
// Shows a chat announcement that when click shows the whisper with text and drawings
Hue.popup_message_received = function(data, type="user", announce=true)
{
    if(!data.id)
    {
        Hue.popup_message_id += 1
        data.id = Hue.popup_message_id
    }

    if(!data.date)
    {
        data.date = Date.now()
    }

    let nd = Hue.utilz.nice_date(data.date)
    let f

    if(data.username)
    {
        if(Hue.user_is_ignored(data.username))
        {
            return false
        }

        if(Hue.accept_commands_from_list.includes(data.username))
        {
            if(data.message && Hue.is_command(data.message))
            {
                Hue.execute_whisper_command(data.username, data.message)
                return
            }
        }

        f = function()
        {
            Hue.show_profile(data.username)
        }
    }

    let ch

    if(data.draw_coords)
    {
        ch = `<canvas
        id='draw_popup_area_${data.id}'
        class='draw_canvas dynamic_title draw_canvas_received'
        title='${nd}' data-otitle='${nd}'
        data-date='${data.date}'
        width='400px' height='300px'
        tabindex=1></canvas>`
    }

    else
    {
        ch = false
    }

    let t
    let title
    let h

    if(type === "user")
    {
        t = `Whisper from ${data.username}`
        title = {text:t, onclick:f}
        h = `<div class='small_button action inline show_message_reply'>${Hue.utilz.nonbreak("Send Whisper")}</div>`
    }

    else if(type === "ops")
    {
        t = `Whisper (To Operators) from ${data.username}`
        title = {text:t, onclick:f}

        let h0

        if(data.username !== Hue.username)
        {
            h0 = `<div class='small_button_2 action show_message_reply show_message_reply_with_spacing'>${Hue.utilz.nonbreak("Send Whisper")}</div>`
        }

        else
        {
            h0 = ""
        }

        h = `<div class='flex_column_center'>${h0}<div class='small_button_2 action show_message_reply_ops'>${Hue.utilz.nonbreak("Send Whisper to Operators")}</div></div>`
    }

    else if(type === "room")
    {
        t = `Room Message from ${data.username}`
        title = {text:t, onclick:f}
        h = false
    }

    else if(type === "system")
    {
        t = "System Message"
        title = {text:t}
        h = false
    }

    if(ch)
    {
        if(h)
        {
            h = ch + h
        }

        else
        {
            h = ch
        }
    }

    data.content = Hue.make_safe(
    {
        text: data.message,
        text_as_html: true,
        text_classes: "popup_message_text",
        html: h,
        remove_text_if_empty: true,
        date: data.date
    })

    Hue.setup_whispers_click(data.content, data.username)

    data.title = Hue.make_safe(title)

    if(!announce || Hue.get_setting("open_popup_messages"))
    {
        let closing_popups = false

        for(let p of Hue.get_popup_instances())
        {
            if(p.window.id === `Msg-window-popup_message_${data.id}`)
            {
                p.close(function()
                {
                    Hue.show_popup_message(data)
                })

                closing_popups = true

                break
            }
        }

        if(!closing_popups)
        {
            Hue.show_popup_message(data)
        }
    }

    if(announce)
    {
        let af = function()
        {
            Hue.popup_message_received(data, type, false)
        }

        Hue.feedback(`${t} received`,
        {
            brk: "<i class='icon2c fa fa-envelope'></i>",
            save: true,
            onclick: af
        })
    }

    Hue.on_highlight()
}

// Shows and configures the whisper popup
Hue.show_popup_message = function(data)
{
    let pop = Hue.create_popup("top", `popup_message_${data.id}`)

    pop.show([data.title, data.content], function()
    {
        $(pop.content).find(".show_message_reply").eq(0).click(function()
        {
            Hue.write_popup_message([data.username])
        })

        $(pop.content).find(".show_message_reply_ops").eq(0).click(function()
        {
            Hue.write_popup_message(false, "ops")
        })

        if(data.draw_coords)
        {
            let context = $(`#draw_popup_area_${data.id}`)[0].getContext("2d")

            Hue.canvas_redraw
            ({
                context: context,
                click_x: data.draw_coords[0],
                click_y: data.draw_coords[1],
                drag: data.draw_coords[2]
            })
        }
    })
}

// Setups whispers click events
Hue.setup_whispers_click = function(content, username)
{
    $(content).find(".whisper_link").each(function()
    {
        $(this).click(function()
        {
            Hue.process_write_whisper(`${username} > ${$(this).data("whisper")}`, false)
        })
    })
}

// Setups the drawing area of write whisper windows
Hue.setup_message_area = function()
{
    Hue.draw_message_context = $("#draw_message_area")[0].getContext("2d")
    Hue.clear_draw_message_state()

    $('#draw_message_area').mousedown(function(e)
    {
        Hue.draw_message_just_entered = false
        Hue.draw_message_add_click(e.offsetX, e.offsetY, false)
        Hue.redraw_draw_message()
    })

    $('#draw_message_area').mousemove(function(e)
    {
        if(Hue.mouse_is_down)
        {
            Hue.draw_message_add_click(e.offsetX, e.offsetY, !Hue.draw_message_just_entered)
            Hue.redraw_draw_message()
        }

        Hue.draw_message_just_entered = false
    })

    $('#draw_message_area').mouseenter(function(e)
    {
        Hue.draw_message_just_entered = true
    })
}