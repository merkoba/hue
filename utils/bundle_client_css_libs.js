const fs = require("fs")

let dir_path = "../public/static/css/libs/"
let files = fs.readdirSync(dir_path)
let content = ""

for(let file of files)
{
    if(file === "bundle.min.css")
    {
        continue
    }

    content += fs.readFileSync(`${dir_path}${file}`, "utf8") + "\n"
}

fs.writeFileSync(`${dir_path}bundle.min.css`, content, "utf8")