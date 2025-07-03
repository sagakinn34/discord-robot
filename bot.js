// ロボットに必要な道具を準備
const { Client, GatewayIntentBits, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

// ロボットを作る
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ロボットが起動したときの挨拶
client.once('ready', async () => {
    console.log(`🤖 ${client.user.tag} ロボットが起動しました！`);
    
    // コマンドを登録
    const commands = [
        new SlashCommandBuilder()
            .setName('hello')
            .setDescription('ロボットが挨拶します'),
        
        new SlashCommandBuilder()
            .setName('ads')
            .setDescription('広告の状況を確認')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('status')
                    .setDescription('広告の状況を見る'))
    ];

    try {
        console.log('📝 コマンドを登録中...');
        
        for (const command of commands) {
            await client.application.commands.create(command);
        }
        
        console.log('✅ コマンド登録完了！');
        console.log('💬 Discordで /hello と入力してテストしてね！');
    } catch (error) {
        console.error('❌ エラー:', error);
    }
});

// コマンドが実行されたときの処理
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    try {
        if (commandName === 'hello') {
            await interaction.reply('🤖 こんにちは！わたしは広告管理ロボットです！');
        } else if (commandName === 'ads') {
            await interaction.reply({
                content: '📊 **広告状況**\n' +
                        '✅ 稼働中: 3個\n' +
                        '⏸️ 停止中: 1個\n' +
                        '💰 本日予算: 50,000円\n' +
                        '💸 使用済み: 35,000円',
                ephemeral: false
            });
        }
    } catch (error) {
        console.error('❌ コマンドエラー:', error);
        await interaction.reply('❌ エラーが発生しました...');
    }
});

// ロボットをDiscordに接続
client.login(process.env.DISCORD_TOKEN);