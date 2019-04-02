// Creates a Separator instance
// This is used to apply horizontal separations between items
// It takes into account un-displayed items to separate properly
Hue.setup_separators = function()
{
    Hue.horizontal_separator = Separator.factory(
    {
        mode: "horizontal",
        class: "color_3"
    })

    Hue.vertical_separator = Separator.factory(
    {
        mode: "vertical",
        class: "vertical_separator",
        html: "",
        width: "100%",
        margin_top: "1.8rem",
        margin_bottom: "1.8rem"
    })
}

// Applies separation to generic horizontal separator classes
Hue.setup_generic_separators = function()
{
    $(".generic_horizontal_separator").each(function()
    {
        Hue.horizontal_separator.separate(this)
    })

    $(".generic_vertical_separator").each(function()
    {
        Hue.vertical_separator.separate(this)
    })
}

// This hides the loading animation and makes the main container visible
Hue.make_main_container_visible = function()
{
    $("#loading").css("opacity", 0)
    $("#main_container").css("opacity", 1).css("pointer-events", "initial")

    setTimeout(function()
    {
        $("#loading").css("display", "none")
    }, 1600)
}

// Starts custom 'nice titles' using Tippy
Hue.start_titles = function()
{
    $(".nicetitle").each(function()
    {
        tippy(this,
        {
            delay: [1000, 100],
            animation: 'scale',
            hideOnClick: true,
            duration: 100,
            arrow: true,
            performance: true,
            size: 'regular',
            arrowSize: 'small',
            zIndex: 99999999999
        })
    })
}

// Setup font loading events
Hue.setup_fonts = function()
{
    document.fonts.ready.then(function()
    {
        Hue.on_fonts_loaded()
    })
}

// After the font finished loading
Hue.on_fonts_loaded = function()
{
    Hue.goto_bottom(true, false)
}

// Utility function to create safe html elements with certain options
Hue.make_safe = function(args={})
{
    let def_args =
    {
        text: "",
        text_as_html: false,
        text_classes: false,
        html: false,
        urlize: true,
        onclick: false,
        html_unselectable: true,
        title: false,
        remove_text_if_empty: false,
        date: false
    }

    args = Object.assign(def_args, args)

    let c = $("<div></div>")

    if(args.text || !args.remove_text_if_empty)
    {
        let c_text_classes = "message_info_text inline"

        if(args.onclick)
        {
            c_text_classes += " pointer action"
        }

        if(args.text_classes)
        {
            c_text_classes += ` ${args.text_classes}`
        }

        c.append(`<div class='${c_text_classes}'></div>`)

        let c_text = c.find(".message_info_text").eq(0)

        if(args.text_as_html)
        {
            let h = Hue.replace_markdown(Hue.make_html_safe(args.text))

            if(args.urlize)
            {
                c_text.html(h).urlize()
            }

            else
            {
                c_text.html(h)
            }
        }

        else
        {
            if(args.urlize)
            {
                c_text.text(args.text).urlize()
            }

            else
            {
                c_text.text(args.text)
            }
        }

        if(args.onclick)
        {
            c_text.on("click", args.onclick)
        }

        if(args.date)
        {
            let nd = Hue.utilz.nice_date(args.date)

            c_text.data("date", args.date)
            c_text.data("otitle", nd)
            c_text.attr("title", nd)
            c_text.addClass("dynamic_title")
        }

        else
        {
            if(args.title)
            {
                c_text.attr("title", args.title)
            }
        }
    }

    if(args.html)
    {
        let sp

        if(args.text || !args.remove_text_if_empty)
        {
            sp = "message_info_html_spaced"
        }

        else
        {
            sp = ""
        }

        c.append(`<div class='message_info_html ${sp}'>${args.html}</div>`)

        if(args.html_unselectable)
        {
            c.find(".message_info_html").eq(0).addClass("unselectable")
        }
    }

    return c[0]
}

// Turn a string into safe HTML by replacing < and > to safe versions
Hue.make_html_safe = function(s)
{
    let replaced = s.replace(/\</g, "&lt;").replace(/\>/g, "&gt;")
    return replaced
}