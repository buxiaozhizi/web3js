/*
脚本头部require引用的第三方包，请自行去npm或官网下载，我会给每个包做简单注释
*/
const { ethers } = require("ethers"); //https://docs.ethers.org/v5/ 官方
const { fs, json2Obj } = require("./common/utils");//自己写的工具包，目前其中只引用了request、fs三方包

(async () => {
    //随机生成钱包助记词（和小狐狸等主流ETH钱包插件的助记词生成规则相同）

    const maxWalletCount = 100;//最大助记词钱包数量
    const wallets_json_path = `${__dirname}/wallets.json`;
    //从钱包助记词文件中读取助记词
    const wallets = fs.existsSync(wallets_json_path) ? json2Obj(fs.readFileSync(wallets_json_path).toString()) : [];
    //如果助记词钱包数量不满足最大要求量时，补齐相应数量
    if (wallets.length < maxWalletCount) {
        for (let i = 0, len = maxWalletCount - wallets.length; i < len; i++) {
            //生成24个助记词
            const mnemonic = ethers.utils.entropyToMnemonic(ethers.utils.randomBytes(32));
            wallets.push(mnemonic);
        }
        //把助记词写入文件
        fs.writeFileSync(wallets_json_path, JSON.stringify(wallets, null, 2));
    }
})();