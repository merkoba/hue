module.exports = function(handler, vars, io, db_manager, config, sconfig, utilz, logger)
{
    // Handles theme mode changes
    handler.public.change_theme_mode = function(socket, data)
    {
        if(!handler.is_admin_or_op(socket))
        {
            return handler.get_out(socket)
        }

        if(data.mode !== "automatic" && data.mode !== "custom")
        {
            return handler.get_out(socket)
        }

        db_manager.update_room(socket.hue_room_id,
        {
            theme_mode: data.mode
        })

        handler.room_emit(socket, 'theme_mode_changed',
        {
            mode: data.mode,
            username: socket.hue_username
        })

        handler.push_admin_log_message(socket, `changed the theme color mode to "${data.mode}"`)
    }

    // Handles theme changes
    handler.public.change_theme = function(socket, data)
    {
        if(!handler.is_admin_or_op(socket))
        {
            return handler.get_out(socket)
        }

        if(data.color === undefined)
        {
            return handler.get_out(socket)
        }

        if(data.color !== utilz.clean_string5(data.color))
        {
            return handler.get_out(socket)
        }

        if(!utilz.validate_rgb(data.color))
        {
            return handler.get_out(socket)
        }

        db_manager.update_room(socket.hue_room_id,
        {
            theme: data.color
        })

        handler.room_emit(socket, 'theme_change',
        {
            color: data.color,
            username: socket.hue_username
        })

        handler.push_admin_log_message(socket, `changed the theme to "${data.color}"`)
    }

    // Handles background mode changes
    handler.public.change_background_mode = function(socket, data)
    {
        if(!handler.is_admin_or_op(socket))
        {
            return handler.get_out(socket)
        }

        if(
            data.mode !== "normal" &&
            data.mode !== "tiled" &&
            data.mode !== "mirror" &&
            data.mode !== "mirror_tiled" &&
            data.mode !== "solid")
        {
            return handler.get_out(socket)
        }

        db_manager.update_room(socket.hue_room_id,
        {
            background_mode: data.mode
        })

        handler.room_emit(socket, 'background_mode_changed',
        {
            mode: data.mode,
            username: socket.hue_username
        })

        handler.push_admin_log_message(socket, `changed the background mode to "${data.mode}"`)
    }

    // Handles background effect changes
    handler.public.change_background_effect = function(socket, data)
    {
        if(!handler.is_admin_or_op(socket))
        {
            return handler.get_out(socket)
        }

        if(
            data.effect !== "none" &&
            data.effect !== "blur")
        {
            return handler.get_out(socket)
        }

        db_manager.update_room(socket.hue_room_id,
        {
            background_effect: data.effect
        })

        handler.room_emit(socket, 'background_effect_changed',
        {
            effect: data.effect,
            username: socket.hue_username
        })

        handler.push_admin_log_message(socket, `changed the background effect to "${data.effect}"`)
    }

    // Handles background tile dimension changes
    handler.public.change_background_tile_dimensions = function(socket, data)
    {
        if(!handler.is_admin_or_op(socket))
        {
            return handler.get_out(socket)
        }

        if(data.dimensions.length > config.safe_limit_1)
        {
            return handler.get_out(socket)
        }

        if(data.dimensions !== utilz.clean_string2(data.dimensions))
        {
            return handler.get_out(socket)
        }

        db_manager.update_room(socket.hue_room_id,
        {
            background_tile_dimensions: data.dimensions
        })

        handler.room_emit(socket, 'background_tile_dimensions_changed',
        {
            dimensions: data.dimensions,
            username: socket.hue_username
        })

        handler.push_admin_log_message(socket, `changed the background tile dimensions to "${data.dimensions}"`)
    }

    // Handles text color mode changes
    handler.public.change_text_color_mode = function(socket, data)
    {
        if(!handler.is_admin_or_op(socket))
        {
            return handler.get_out(socket)
        }

        if(data.mode !== "automatic" && data.mode !== "custom")
        {
            return handler.get_out(socket)
        }

        db_manager.update_room(socket.hue_room_id,
        {
            text_color_mode: data.mode
        })

        handler.room_emit(socket, 'text_color_mode_changed',
        {
            mode: data.mode,
            username: socket.hue_username
        })

        handler.push_admin_log_message(socket, `changed the text color mode to "${data.mode}"`)
    }

    // Handles text color changes
    handler.public.change_text_color = function(socket, data)
    {
        if(!handler.is_admin_or_op(socket))
        {
            return handler.get_out(socket)
        }

        if(data.color === undefined)
        {
            return handler.get_out(socket)
        }

        if(data.color !== utilz.clean_string5(data.color))
        {
            return handler.get_out(socket)
        }

        if(!utilz.validate_rgb(data.color))
        {
            return handler.get_out(socket)
        }

        db_manager.update_room(socket.hue_room_id,
        {
            text_color: data.color
        })

        handler.room_emit(socket, 'text_color_changed',
        {
            color: data.color,
            username: socket.hue_username
        })

        handler.push_admin_log_message(socket, `changed the text color to "${data.color}"`)
    }

    // Handles uploaded background images
    handler.upload_background_image = function(socket, data)
    {
        if(data.image_file === undefined)
        {
            return handler.get_out(socket)
        }

        if(data.extension === undefined)
        {
            return handler.get_out(socket)
        }

        let size = data.image_file.byteLength / 1024

        if(size === 0 || (size > config.max_image_size))
        {
            handler.user_emit(socket, 'upload_error', {})
            return false
        }

        let fname = `bg_${socket.hue_room_id}_${Date.now()}_${utilz.get_random_int(0, 1000)}.${data.extension}`

        vars.fs.writeFile(vars.images_root + '/' + fname, data.image_file, function(err, data)
        {
            if(err)
            {
                handler.user_emit(socket, 'upload_error', {})
            }

            else
            {
                handler.change_background_image(socket, fname)
            }
        })
    }

    // Handles background image source changes
    handler.public.change_background_image_source = function(socket, data)
    {
        if(!handler.is_admin_or_op(socket))
        {
            return handler.get_out(socket)
        }

        if(data.src === undefined)
        {
            return handler.get_out(socket)
        }

        if(data.src.length === 0)
        {
            return handler.get_out(socket)
        }

        if(data.src.length > config.max_image_source_length)
        {
            return handler.get_out(socket)
        }

        if(data.src !== "default")
        {
            if(!utilz.is_url(data.src))
            {
                return false
            }

            data.src = data.src.replace(/\s/g,'').replace(/\.gifv/g,'.gif')

            let extension = utilz.get_extension(data.src).toLowerCase()

            if(!extension || !utilz.image_extensions.includes(extension))
            {
                return false
            }
        }

        handler.do_change_background_image(socket, data.src, "external")
    }

    // Intermidiate step to change the background image
    handler.change_background_image = function(socket, fname)
    {
        if(config.image_storage_s3_or_local === "local")
        {
            handler.do_change_background_image(socket, fname, "hosted")
        }

        else if(config.image_storage_s3_or_local === "s3")
        {
            vars.fs.readFile(`${vars.images_root}/${fname}`, (err, data) =>
            {
                if(err)
                {
                    vars.fs.unlink(`${vars.images_root}/${fname}`, function(){})
                    return
                }

                vars.s3.putObject(
                {
                    ACL: "public-read",
                    ContentType: handler.get_content_type(fname),
                    Body: data,
                    Bucket: sconfig.s3_bucket_name,
                    Key: `${sconfig.s3_images_location}${fname}`,
                    CacheControl: `max-age=${sconfig.s3_cache_max_age}`
                }).promise()

                .then(ans =>
                {
                    vars.fs.unlink(`${vars.images_root}/${fname}`, function(){})
                    handler.do_change_background_image(socket, sconfig.s3_main_url + sconfig.s3_images_location + fname, "hosted")
                })

                .catch(err =>
                {
                    vars.fs.unlink(`${vars.images_root}/${fname}`, function(){})
                    logger.log_error(err)
                })
            })
        }

        else
        {
            return false
        }
    }

    // Completes background image changes
    handler.do_change_background_image = async function(socket, fname, type)
    {
        let info = await db_manager.get_room({_id:socket.hue_room_id}, {background_image:1, background_image_type:1})
        let image_url

        if(type === "hosted")
        {
            if(config.image_storage_s3_or_local === "local")
            {
                image_url = config.public_images_location + fname
            }

            else if(config.image_storage_s3_or_local === "s3")
            {
                image_url = fname
            }
        }

        else
        {
            image_url = fname
        }

        let to_delete = false

        if(info.background_image !== "")
        {
            if(info.background_image_type === "hosted")
            {
                to_delete = info.background_image
            }
        }

        if(fname === "default")
        {
            fname = ""
            image_url = ""
            type = "hosted"
        }

        let date = Date.now()

        let ans = await db_manager.update_room(socket.hue_room_id,
        {
            background_image: fname,
            background_image_type: type,
            background_image_setter: socket.hue_username,
            background_image_date: date
        })

        handler.room_emit(socket, 'background_image_change',
        {
            username: socket.hue_username,
            background_image: image_url,
            background_image_setter: socket.hue_username,
            background_image_date: date
        })

        if(to_delete)
        {
            if(!to_delete.includes(sconfig.s3_main_url))
            {
                vars.fs.unlink(`${vars.images_root}/${to_delete}`, function(err){})
            }

            else
            {
                vars.s3.deleteObject(
                {
                    Bucket: sconfig.s3_bucket_name,
                    Key: to_delete.replace(sconfig.s3_main_url, "")
                }).promise()

                .catch(err =>
                {
                    logger.log_error(err)
                })
            }
        }

        handler.push_admin_log_message(socket, "changed the background image")
    }
}