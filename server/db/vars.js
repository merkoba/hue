module.exports = function (vars, manager, db, config, sconfig, utilz, logger) {
  // Initial declarations
  vars.fs = require("fs")
  vars.path = require("path")
  vars.mongo = require("mongodb")
  vars.bcrypt = require("bcrypt")
  vars.mailgun = require("mailgun-js")({
    apiKey: sconfig.mailgun_api_key,
    domain: sconfig.mailgun_domain,
  })
  vars.reserved_usernames = [
    config.system_username
  ].map((x) => x.toLowerCase())

  // Room and User versions
  // These must be increased by 1 when the schema changes
  vars.rooms_version = 82
  vars.users_version = 49

  // Room schema definition
  // This is used to check types and fill defaults
  vars.rooms_schema = function () {
    return {
      name: { type: "string", default: "No Name" },
      topic: { type: "string", default: "" },
      keys: { type: "object", default: {} },
      stored_images: { type: "object", default: [] },
      image_id: { type: "string", default: "" },
      image_user_id: { type: "string", default: "" },
      image_source: { type: "string", default: "" },
      image_setter: { type: "string", default: "" },
      image_size: { type: "number", default: 0 },
      image_date: { type: "number", default: 0 },
      image_query: { type: "string", default: "" },
      image_type: { type: "string", default: "link" },
      image_comment: { type: "string", default: "" },
      tv_id: { type: "string", default: "" },
      tv_user_id: { type: "string", default: "" },
      tv_type: { type: "string", default: "tv" },
      tv_source: { type: "string", default: "" },
      tv_title: { type: "string", default: "" },
      tv_setter: { type: "string", default: "" },
      tv_date: { type: "number", default: 0 },
      tv_query: { type: "string", default: "" },
      tv_comment: { type: "string", default: "" },
      bans: { type: "object", default: [] },
      log_messages: { type: "object", default: [] },
      admin_log_messages: { type: "object", default: [] },
      background_color: { type: "string", default: "#36393f" },
      text_color: { type: "string", default: "#dcddde" },
      background_image: { type: "string", default: "" },
      background_image_type: { type: "string", default: "hosted" },
      message_board_posts: { type: "object", default: [] },
      modified: { type: "number", default: Date.now() },
    }
  }

  // User schema definition
  // This is used to check types and fill defaults
  vars.users_schema = function () {
    return {
      username: { type: "string", default: "", skip: true },
      password: { type: "string", default: "", skip: true },
      email: { type: "string", default: "", skip: true },
      password_date: { type: "number", default: 0 },
      password_reset_code: { type: "string", default: "" },
      password_reset_date: { type: "number", default: 0 },
      password_reset_link_date: { type: "number", default: 0 },
      profile_image: { type: "string", default: "" },
      profile_image_version: { type: "number", default: 0 },
      verified: { type: "boolean", default: false },
      verification_code: { type: "string", default: "" },
      registration_date: { type: "number", default: 0 },
      email_change_code: { type: "string", default: "" },
      email_change_date: { type: "number", default: 0 },
      email_change_code_date: { type: "number", default: 0 },
      create_room_date: { type: "number", default: 0 },
      bio: { type: "string", default: "" },
      hearts: { type: "number", default: 0 },
      skulls: { type: "number", default: 0 },
      audio_clip: { type: "string", default: "" },
      audio_clip_version: { type: "number", default: 0 },
      modified: { type: "number", default: Date.now() },
    }
  } 
}
