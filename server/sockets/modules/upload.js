module.exports = function(handler, vars, io, db_manager, config, sconfig, utilz, logger)
{
    // Receives sliced files uploads and requests more slices
    // Sends uploaded files to respective functions
    handler.public.slice_upload = async function(socket, data)
    {
        if(data.action === "image_upload")
        {
            if(!handler.check_permission(socket, "images"))
            {
                return false
            }
        }

        if(data.data.length > config.upload_slice_size)
        {
            return handler.get_out(socket)
        }

        let key = `${socket.hue_user_id}_${data.date}`
        let file = vars.files[key]

        if(!file)
        {
            let spam_ans = await handler.add_spam(socket)

            if(!spam_ans)
            {
                return false
            }

            if(!vars.image_types.includes(data.type))
            {
                return handler.get_out(socket)
            }

            let ext = data.name.split('.').pop(-1).toLowerCase()

            if(!utilz.image_extensions.includes(ext))
            {
                return handler.get_out(socket)
            }

            if(data.comment)
            {
                if(data.comment.length > config.safe_limit_4)
                {
                    return handler.get_out(socket)
                }
            }

            data.extension = ext

            vars.files[key] = Object.assign({}, vars.files_struct, data)

            file = vars.files[key]

            file.data = []
        }

        if(file.cancelled)
        {
            delete vars.files[key]
            return false
        }

        data.data = Buffer.from(new Uint8Array(data.data))

        file.data.push(data.data)

        file.slice++

        file.received += data.data.length

        let fsize = file.received / 1024

        if(fsize > config.max_image_size)
        {
            delete vars.files[key]
            return handler.get_out(socket)
        }

        let spsize = Math.floor(fsize / (config.max_image_size / vars.upload_spam_slice))

        if(file.spsize !== spsize)
        {
            let spam_ans = await handler.add_spam(socket)

            if(!spam_ans)
            {
                return false
            }

            file.spsize = spsize
        }

        file.updated = Date.now()

        if(file.slice * config.upload_slice_size >= file.size)
        {
            handler.user_emit(socket, 'upload_ended', {date:data.date})

            let full_file = Buffer.concat(file.data)

            if(data.action === "image_upload")
            {
                handler.upload_image(socket,
                {
                    image_file: full_file,
                    extension: file.extension,
                    comment: file.comment
                })
            }

            else if(data.action === "profile_image_upload")
            {
                handler.upload_profile_image(socket,
                {
                    image_file: full_file
                })
            }

            else if(data.action === "background_image_upload")
            {
                handler.upload_background_image(socket,
                {
                    image_file: full_file,
                    extension: file.extension
                })
            }

            delete vars.files[key]
        }

        else
        {
            handler.user_emit(socket, 'request_slice_upload',
            {
                current_slice: file.slice,
                date: data.date
            })
        }
    }

    // Flags a file as cancelled
    handler.public.cancel_upload = function(socket, data)
    {
        let key = `${socket.hue_user_id}_${data.date}`
        let file = vars.files[key]

        if(file)
        {
            file.cancelled = true
        }
    }
}