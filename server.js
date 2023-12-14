require("dotenv").config();

const express = require("express");
const app = express();
const fs = require("fs");

app.use(express.static("public"));

const listener = app.listen(process.env.PORT, function () {
  console.log("shinsetsu is listening on port " + listener.address().port);
});

//Discord.js initialized
const Discord = require("discord.js");
const client = new Discord.Client();
var prefix = "/";

var inface = require("./interface");
inface.setClient(Discord);

var Interpreter = require("./interpreter");
var Command = require("./command");
var Alias = require("./alias");

//Evergreen storage Required
const Evg = require("./evg");

//Guild settings
const settings = require("./settings");

client.on("guildCreate", (guild) => {
  guild.channels
    .find("name", "general")
    .send(
      "Thanks for adding shinsetsu to your guild! Use the command /sifcasino to get started.",
    );
  guild
    .createRole({
      name: "Casino",
      color: "#593695",
    })
    .then((role) => guild.member(client.user).addRole(role))
    .catch(console.error);
});

var commands = [];

/**
 * @type Command[]
 */
var requisites = [];

client.on("ready", () => {
  console.log("shinsetsu is up and running!");
  client.user.setActivity("/shinsetsuhelp", {
    type: "LISTENING",
    url: "https://discord.gg/N8YjzTJCYu",
  });

  //Import commands:
  var cmdfiles = fs.readdirSync("commands");
  cmdfiles.forEach((item) => {
    var file = require(`./commands/${item.substring(0, item.length - 3)}`);
    if (file instanceof Command) {
      requisites.push(file);
    } else if ("commands" in file) {
      file.commands.forEach((alias) => {
        if (alias instanceof Command) requisites.push(alias);
        else if (alias instanceof Alias) requisites.push(alias.getAsCommand());
      });
    }
  });

  commands = requisites.find((c) => c.getName() == "help").getCommands();
});

client.on("message", (message) => {
  try {
    // Avoid bot messages, DM and otherwise:

    if (message.author.bot) {
      return false;
    }

    //Create new interpreter
    var intp = new Interpreter(message);

    //Determine prefix

    prefix = settings.get(message.guild.id, "prefix");

    //Command determination:

    var splitter = message.content.replace(" ", ";:splitter185151813367::");
    var splitted = splitter.split(";:splitter185151813367::");

    var fixRegExp = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    var re = new RegExp(fixRegExp);

    var command = splitted[0].replace(re, "");
    command = command.toLowerCase();

    if (splitted[1]) {
      var args = splitted[1].split(" ");
    } else {
      var args = false;
    }

    // DM determination:

    if (message.guild === null) {
      message.reply(
        "Sorry " +
          message.author.username +
          ", DM commands are not supported by this bot.",
      );

      return false;
    }

    //Universal help command:

    if (
      message.content == "/sifcasino" ||
      message.content == "/shinsetsu" ||
      message.content == "/shinsetsuhelp"
    ) {
      var usable = commands.find((c) => c.name == "help").cmd;
      usable.set(message);

      usable.execute([prefix, args]).catch((err) => {
        message.reply("An error occurred: " + err);
      });

      return;
    } else if (message.content == "/shinsetsuprefix") {
      //Fetches the prefix (setting the prefix through this is not enabled)

      var usable = commands.find((c) => c.name == "prefix").cmd;
      usable.set(message);

      usable.execute([]).catch((err) => {
        message.reply("An error occurred: " + err);
      });

      return;
    }

    //Check for command:
    var cmd = false;

    commands.forEach((item, index) => {
      if (item.name == command) {
        cmd = item.cmd;
      }
    });

    //Run commands if matches prefix:

    if (cmd && splitted[0].match(prefix)) {
      message.channel.startTyping();
      setTimeout(() => {
        cmd.set(message);
        if (cmd.matches("help")) {
          cmd.execute([prefix, args]).catch((err) => {
            message.reply("An error occurred: " + err);
          });
        } else {
          cmd.execute(args).catch((err) => {
            message.reply("An error occurred: " + err);
          });
        }
        message.channel.stopTyping();
      }, 1000);
    } else {
      intp.interpret(message.content.split(" "));
    }
  } catch (err) {
    message.channel.send(`Errors found:\n\`\`\`${err}\nAt ${err.stack}\`\`\``);
  }
});

//Added token
client.login(process.env.TOKEN);
