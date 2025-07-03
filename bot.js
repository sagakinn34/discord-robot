// 必要なライブラリを読み込み
const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

// Discord クライアント作成
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Facebook Marketing API 設定
const META_BASE_URL = 'https://graph.facebook.com/v18.0';
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID;

// 実際のFacebook広告データを取得
async function fetchRealAdSets() {
    try {
        if (!META_ACCESS_TOKEN || !META_AD_ACCOUNT_ID) {
            console.log('⚠️ Facebook API設定が不完全 - デモモードで動作');
            return null;
        }

        console.log('📡 Facebook APIから広告データを取得中...');
        
        const response = await axios.get(
            `${META_BASE_URL}/${META_AD_ACCOUNT_ID}/adsets`,
            {
                params: {
                    access_token: META_ACCESS_TOKEN,
                    fields: 'id,name,status,daily_budget,lifetime_budget,created_time,updated_time,insights{spend,impressions,clicks,reach}'
                }
            }
        );
        
        console.log(`✅ ${response.data.data.length}個の広告セットを取得`);
        return response.data.data;
    } catch (error) {
        console.error('❌ Facebook API エラー:', error.response?.data || error.message);
        return null;
    }
}

// 広告アカウント情報を取得
async function fetchAdAccountInfo() {
    try {
        if (!META_ACCESS_TOKEN || !META_AD_ACCOUNT_ID) {
            return null;
        }

        // 今日の日付を取得
const today = new Date().toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

const response = await axios.get(
    `${META_BASE_URL}/${META_AD_ACCOUNT_ID}/adsets`,
    {
        params: {
            access_token: META_ACCESS_TOKEN,
            fields: 'id,name,status,daily_budget,lifetime_budget,created_time,updated_time,insights.date_preset(today){spend,impressions,clicks,reach,ctr},insights.date_preset(yesterday){spend,impressions,clicks,reach,ctr}'
        }
    }
);       
        return response.data;
    } catch (error) {
        console.error('❌ 広告アカウント情報取得エラー:', error.response?.data || error.message);
        return null;
    }
}

// 実際にアドセットのステータスを変更
async function updateAdSetStatus(adsetId, status) {
    try {
        const response = await axios.post(
            `${META_BASE_URL}/${adsetId}`,
            {
                status: status,
                access_token: META_ACCESS_TOKEN
            }
        );
        
        return { success: true, data: response.data };
    } catch (error) {
        console.error('❌ アドセット更新エラー:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

// デモデータ（Facebook API接続できない場合のフォールバック）
const demoData = {
    adSets: [
        { id: 'demo_1', name: 'デモ_夏のキャンペーン', status: 'ACTIVE', daily_budget: 10000, spend_today: 8500 },
        { id: 'demo_2', name: 'デモ_新商品プロモ', status: 'PAUSED', daily_budget: 5000, spend_today: 0 },
        { id: 'demo_3', name: 'デモ_リターゲティング', status: 'ACTIVE', daily_budget: 15000, spend_today: 12000 }
    ]
};

// ボット起動時の処理
client.once('ready', async () => {
    console.log(`🤖 ${client.user.tag} が起動しました！`);
    
    // Facebook API接続テスト
    const testData = await fetchRealAdSets();
    if (testData) {
        console.log('✅ Facebook Marketing API 接続成功！');
        console.log(`📊 ${testData.length}個の広告セットが利用可能`);
    } else {
        console.log('⚠️ Facebook API未接続 - デモモードで動作');
    }
    
    // スラッシュコマンドを登録
    const commands = [
        new SlashCommandBuilder()
            .setName('hello')
            .setDescription('ロボットが挨拶します'),
        
        new SlashCommandBuilder()
            .setName('ads')
            .setDescription('📊 Facebook広告管理コマンド')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('search')
                    .setDescription('🔍 広告セットを検索')
                    .addStringOption(option =>
                        option.setName('name')
                            .setDescription('検索する広告セット名')
                            .setRequired(true)))
            .addSubcommand(subcommand =>
                subcommand
                    .setName('toggle')
                    .setDescription('⚡ 広告セットのON/OFF切り替え')
                    .addStringOption(option =>
                        option.setName('ids')
                            .setDescription('操作するID（カンマ区切り）例: 123456,789012')
                            .setRequired(true))
                    .addStringOption(option =>
                        option.setName('action')
                        .setDescription('実行するアクション')
                        .setRequired(true)
                        .addChoices(
                            { name: '▶️ ON（開始）', value: 'ACTIVE' },
                            { name: '⏸️ OFF（停止）', value: 'PAUSED' }
                        )))
            .addSubcommand(subcommand =>
                subcommand
                    .setName('status')
                    .setDescription('📈 Facebook広告全体状況確認'))
            .addSubcommand(subcommand =>
                subcommand
                    .setName('api-test')
                    .setDescription('🔧 Facebook API接続テスト'))
            .addSubcommand(subcommand =>
                subcommand
                    .setName('list')
                    .setDescription('📋 全広告セット一覧表示'))
    ];

    try {
        console.log('🔄 スラッシュコマンドを登録中...');
        
        for (const command of commands) {
            await client.application.commands.create(command);
        }
        
        console.log('✅ スラッシュコマンド登録完了！');
        console.log('💬 Discordで /ads list で全広告セット一覧を確認できます');
    } catch (error) {
        console.error('❌ コマンド登録エラー:', error);
    }
});

// スラッシュコマンドの処理
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options } = interaction;

    try {
        if (commandName === 'hello') {
            await interaction.reply('🤖 こんにちは！Facebook広告管理ロボットです！25個の広告セットを管理中です！');
        } else if (commandName === 'ads') {
            const subcommand = options.getSubcommand();
            
            if (subcommand === 'search') {
                const searchName = options.getString('name');
                await handleRealSearch(interaction, searchName);
            } else if (subcommand === 'toggle') {
                const ids = options.getString('ids');
                const action = options.getString('action');
                await handleRealToggle(interaction, ids, action);
            } else if (subcommand === 'status') {
                await handleRealStatus(interaction);
            } else if (subcommand === 'api-test') {
                await handleApiTest(interaction);
            } else if (subcommand === 'list') {
                await handleAdSetList(interaction);
            }
        }
    } catch (error) {
        console.error('❌ コマンド実行エラー:', error);
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ エラーが発生しました。管理者に連絡してください。',
                ephemeral: true
            });
        }
    }
});

// 実際のFacebook API検索処理
async function handleRealSearch(interaction, searchName) {
    await interaction.deferReply();
    
    try {
        console.log(`🔍 検索実行: ${searchName}`);
        
        // 実際のFacebook APIからデータを取得
        const realAdSets = await fetchRealAdSets();
        const dataSource = realAdSets || demoData.adSets;
        const isRealData = realAdSets !== null;
        
        // 検索実行
        const results = dataSource.filter(adset => 
            adset.name.toLowerCase().includes(searchName.toLowerCase())
        );

        if (results.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle('🔍 検索結果')
                .setColor('#ff6b6b')
                .setDescription(`**${searchName}** に一致する広告セットが見つかりませんでした。\n\n💡 /ads list で全広告セット一覧を確認してください。`)
                .setFooter({ 
                    text: isRealData ? 'Facebook Marketing API連携済み' : 'デモモード（Facebook API未接続）'
                });

            return await interaction.editReply({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
            .setTitle(`🔍 ${isRealData ? '実際の' : 'デモ'}広告検索結果: ${searchName}`)
            .setColor('#4ecdc4')
            .setDescription(`**${results.length}個**の広告セットが見つかりました:`)
            .setFooter({ 
                text: isRealData ? 'Facebook Marketing API連携済み' : 'デモモード（Facebook API未接続）'
            });

        results.slice(0, 10).forEach((result, index) => {
            const statusEmoji = result.status === 'ACTIVE' ? '✅' : '⏸️';
            const statusText = result.status === 'ACTIVE' ? '稼働中' : '停止中';
            const spend = result.insights?.[0]?.spend || result.spend_today || 0;
            
            embed.addFields({
                name: `${index + 1}. ${result.name}`,
                value: `${statusEmoji} **状態**: ${statusText}\n` +
                       `💰 **日予算**: ${result.daily_budget || 'N/A'}円\n` +
                       `💸 **消化**: ${Math.round(spend)}円\n` +
                       `🆔 **ID**: ${result.id}`,
                inline: true
            });
        });

        await interaction.editReply({ embeds: [embed] });
        
    } catch (error) {
        console.error('検索エラー:', error);
        await interaction.editReply('❌ 検索中にエラーが発生しました。');
    }
}

// 全広告セット一覧表示
async function handleAdSetList(interaction) {
    await interaction.deferReply();
    
    try {
        console.log('📋 全広告セット一覧を取得中...');
        
        // 実際のFacebook APIからデータを取得
        const realAdSets = await fetchRealAdSets();
        const dataSource = realAdSets || demoData.adSets;
        const isRealData = realAdSets !== null;

        if (!dataSource || dataSource.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle('📋 広告セット一覧')
                .setColor('#ff6b6b')
                .setDescription('広告セットが見つかりませんでした。')
                .setFooter({ 
                    text: isRealData ? 'Facebook Marketing API連携済み' : 'デモモード（Facebook API未接続）'
                });

            return await interaction.editReply({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
            .setTitle(`📋 ${isRealData ? '実際の' : 'デモ'}広告セット一覧`)
            .setColor('#4ecdc4')
            .setDescription(`**${dataSource.length}個**の広告セットが利用可能です:`)
            .setFooter({ 
                text: isRealData ? 'Facebook Marketing API連携済み' : 'デモモード（Facebook API未接続）'
            });

        // 最初の15個まで表示
        dataSource.slice(0, 15).forEach((adset, index) => {
            const statusEmoji = adset.status === 'ACTIVE' ? '✅' : '⏸️';
            const statusText = adset.status === 'ACTIVE' ? '稼働中' : '停止中';
            const spend = adset.insights?.[0]?.spend || adset.spend_today || 0;
            const reach = adset.insights?.[0]?.reach || 'N/A';
            
            embed.addFields({
                name: `${index + 1}. ${adset.name.substring(0, 40)}${adset.name.length > 40 ? '...' : ''}`,
                value: `${statusEmoji} ${statusText}\n` +
                       `💰 予算: ${adset.daily_budget || 'N/A'}円\n` +
                       `💸 消化: ${Math.round(spend)}円\n` +
                       `👥 リーチ: ${reach}\n` +
                       `🆔 ${adset.id}`,
                inline: true
            });
        });

        if (dataSource.length > 15) {
            embed.addFields({
                name: '📝 表示制限',
                value: `全${dataSource.length}個中、最初の15個を表示中\n検索機能を使って特定の広告セットを探せます`,
                inline: false
            });
        }

        await interaction.editReply({ embeds: [embed] });
        
    } catch (error) {
        console.error('一覧表示エラー:', error);
        await interaction.editReply('❌ 一覧取得中にエラーが発生しました。');
    }
}

// 実際のFacebook API状況確認処理
async function handleRealStatus(interaction) {
    await interaction.deferReply();
    
    try {
        console.log('📊 Facebook広告全体状況を取得中...');
        
        // 実際のFacebook APIからデータを取得
        const realAdSets = await fetchRealAdSets();
        const accountInfo = await fetchAdAccountInfo();
        const isRealData = realAdSets !== null;
        
        const dataSource = realAdSets || demoData.adSets;
        
        // 統計計算
        const activeAdSets = dataSource.filter(as => as.status === 'ACTIVE');
        const pausedAdSets = dataSource.filter(as => as.status === 'PAUSED');
        
        let totalSpend = 0;
        let totalBudget = 0;
        let totalImpressions = 0;
        let totalClicks = 0;
        
        dataSource.forEach(adset => {
            if (adset.insights && adset.insights[0]) {
                totalSpend += parseFloat(adset.insights[0].spend || 0);
                totalImpressions += parseInt(adset.insights[0].impressions || 0);
                totalClicks += parseInt(adset.insights[0].clicks || 0);
            } else {
                totalSpend += adset.spend_today || 0;
            }
            totalBudget += parseFloat(adset.daily_budget || 0);
        });

        const embed = new EmbedBuilder()
            .setTitle(`📊 ${isRealData ? '実際の' : 'デモ'}Facebook広告全体状況`)
            .setColor('#4ecdc4')
            .setDescription('現在の広告運用状況をお知らせします')
            .addFields(
                {
                    name: '📈 稼働状況',
                    value: `▶️ **稼働中**: ${activeAdSets.length}個\n⏸️ **停止中**: ${pausedAdSets.length}個\n📊 **合計**: ${dataSource.length}個`,
                    inline: true
                },
                {
                    name: '💰 予算・消化状況',
                    value: `💸 **総消化額**: ${Math.round(totalSpend).toLocaleString()}円\n💳 **総日予算**: ${Math.round(totalBudget).toLocaleString()}円\n📊 **消化率**: ${totalBudget > 0 ? Math.round((totalSpend/totalBudget)*100) : 0}%`,
                    inline: true
                }
            );

        if (totalImpressions > 0 || totalClicks > 0) {
            embed.addFields({
                name: '📊 パフォーマンス',
                value: `👁️ **インプレッション**: ${totalImpressions.toLocaleString()}\n🖱️ **クリック**: ${totalClicks.toLocaleString()}\n📈 **CTR**: ${totalImpressions > 0 ? ((totalClicks/totalImpressions)*100).toFixed(2) : 0}%`,
                inline: true
            });
        }

        if (accountInfo) {
            embed.addFields({
                name: '🏪 アカウント情報',
                value: `📱 **アカウント名**: ${accountInfo.name}\n💰 **残高**: ${accountInfo.balance ? Math.round(accountInfo.balance/100).toLocaleString() : 'N/A'}円\n📊 **ステータス**: ${accountInfo.account_status}`,
                inline: false
            });
        }

        // 高消化アドセットの警告
        const highSpendAdSets = dataSource.filter(as => {
            const spend = as.insights?.[0]?.spend || as.spend_today || 0;
            const budget = as.daily_budget || 1;
            const usage = spend / budget;
            return usage > 0.8 && as.status === 'ACTIVE';
        });

        if (highSpendAdSets.length > 0) {
            const warningText = highSpendAdSets.slice(0, 5).map(as => {
                const spend = as.insights?.[0]?.spend || as.spend_today || 0;
                const budget = as.daily_budget || 1;
                const usage = Math.round((spend / budget) * 100);
                return `⚠️ ${as.name.substring(0, 30)}... (${usage}%)`;
            }).join('\n');

            embed.addFields({
                name: '⚠️ 注意が必要な広告セット',
                value: warningText,
                inline: false
            });
        }

        embed.setFooter({ 
            text: `${isRealData ? 'Facebook Marketing API連携済み' : 'デモモード'} | 最終更新: ${new Date().toLocaleString('ja-JP')}`
        });

        await interaction.editReply({ embeds: [embed] });
        
    } catch (error) {
        console.error('ステータス確認エラー:', error);
        await interaction.editReply('❌ ステータス確認中にエラーが発生しました。');
    }
}

// 実際のFacebook API操作処理
async function handleRealToggle(interaction, ids, action) {
    await interaction.deferReply();
    
    try {
        console.log(`⚡ 実際のFacebook広告操作: IDs=${ids}, Action=${action}`);
        
        const idList = ids.split(',').map(id => id.trim()).filter(id => id.length > 0);
        const actionText = action === 'ACTIVE' ? 'ON（開始）' : 'OFF（停止）';
        const emoji = action === 'ACTIVE' ? '▶️' : '⏸️';
        
        if (idList.length === 0) {
            return await interaction.editReply('❌ 有効なIDが指定されていません。例: 123456789,987654321');
        }

        const results = [];
        const errors = [];
        
        for (const id of idList) {
            console.log(`🔄 広告セット ${id} を ${action} に変更中...`);
            
            const result = await updateAdSetStatus(id, action);
            
            if (result.success) {
                results.push({
                    id: id,
                    success: true,
                    action: actionText
                });
                console.log(`✅ 広告セット ${id} の操作成功`);
            } else {
                errors.push(`ID ${id}: ${result.error.error?.message || '操作に失敗しました'}`);
                console.log(`❌ 広告セット ${id} の操作失敗: ${result.error}`);
            }
        }

        const embed = new EmbedBuilder()
            .setTitle(`${emoji} Facebook広告操作結果`)
            .setColor(results.length > 0 ? (action === 'ACTIVE' ? '#00ff00' : '#ff9900') : '#ff6b6b')
            .setDescription(`${actionText}の実行結果:`);

        if (results.length > 0) {
            const successText = results.map(result => 
                `✅ **広告セットID**: ${result.id}\n└ 操作: ${result.action}`
            ).join('\n\n');
            
            embed.addFields({
                name: `📊 成功 (${results.length}件)`,
                value: successText,
                inline: false
            });
        }

        if (errors.length > 0) {
            embed.addFields({
                name: `❌ エラー (${errors.length}件)`,
                value: errors.join('\n'),
                inline: false
            });
        }

        embed.addFields({
            name: '💡 ヒント',
            value: '/ads list で広告セットIDを確認できます\n操作後は /ads status で状況を確認してください',
            inline: false
        });

        embed.setFooter({ 
            text: `Facebook Marketing API連携済み | 実行時刻: ${new Date().toLocaleString('ja-JP')}` 
        });

        await interaction.editReply({ embeds: [embed] });
        
    } catch (error) {
        console.error('操作エラー:', error);
        await interaction.editReply('❌ 操作中にエラーが発生しました。');
    }
}

// Facebook API接続テスト
async function handleApiTest(interaction) {
    await interaction.deferReply();
    
    try {
        const embed = new EmbedBuilder()
            .setTitle('🔧 Facebook API接続テスト')
            .setColor('#4ecdc4');

        // 環境変数チェック
        const hasAppId = !!process.env.META_APP_ID;
        const hasSecret = !!process.env.META_APP_SECRET;
        const hasToken = !!process.env.META_ACCESS_TOKEN;
        const hasAccount = !!process.env.META_AD_ACCOUNT_ID;

        embed.addFields({
            name: '📋 設定状況',
            value: `${hasAppId ? '✅' : '❌'} Meta App ID\n` +
                   `${hasSecret ? '✅' : '❌'} Meta App Secret\n` +
                   `${hasToken ? '✅' : '❌'} Access Token\n` +
                   `${hasAccount ? '✅' : '❌'} Ad Account ID`,
            inline: false
        });

        // APIテスト実行
        if (hasToken && hasAccount) {
            const testData = await fetchRealAdSets();
            const accountInfo = await fetchAdAccountInfo();
            
            if (testData) {
                embed.addFields({
                    name: '🚀 API接続テスト',
                    value: `✅ **接続成功！**\n📊 ${testData.length}個の広告セットを取得`,
                    inline: false
                });
                
                if (accountInfo) {
                    embed.addFields({
                        name: '🏪 アカウント情報',
                        value: `📱 **名前**: ${accountInfo.name}\n📊 **ステータス**: ${accountInfo.account_status}`,
                        inline: false
                    });
                }
                
                embed.setColor('#00ff00');
            } else {
                embed.addFields({
                    name: '🚀 API接続テスト',
                    value: '❌ **接続失敗**\n詳細はサーバーログを確認してください',
                    inline: false
                });
                embed.setColor('#ff6b6b');
            }
        } else {
            embed.addFields({
                name: '🚀 API接続テスト',
                value: '⚠️ **設定不完全**\n必要な環境変数が設定されていません',
                inline: false
            });
            embed.setColor('#ff9900');
        }

        await interaction.editReply({ embeds: [embed] });
        
    } catch (error) {
        console.error('APIテストエラー:', error);
        await interaction.editReply('❌ APIテスト中にエラーが発生しました。');
    }
}

// エラーハンドリング
client.on('error', (error) => {
    console.error('❌ Discord エラー:', error);
});

// ロボットをDiscordに接続
console.log('🚀 Facebook広告管理ロボットを起動中...');
client.login(process.env.DISCORD_TOKEN);