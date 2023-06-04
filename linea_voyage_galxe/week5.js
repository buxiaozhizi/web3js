/*
脚本头部require引用的第三方包，请自行去npm或官网下载，我会给每个包做简单注释
*/
const { ethers, Wallet, providers } = require("ethers"); //https://docs.ethers.org/v5/ 官方
const { sleep, wait, fs, json2Obj } = require("../common/utils");//自己写的工具包，目前其中只引用了request、fs三方包

let provider;

async function sendTrans(privateKey, tx) {
    const walletSigner = new Wallet(privateKey).connect(provider);
    try {
        const { hash: transactionHash } = await walletSigner.sendTransaction(tx);
        const isOk = await transIsOk(transactionHash);
        if (isOk) {
            return transactionHash;
        } else {
            console.log('交易失败', tx.from);
            return null;
        }
    } catch (error) {
        return null;
    }
};

async function transIsOk(transactionHash) {
    let status;
    try {
        await wait(async () => {
            try {
                const transactionReceipt = await provider.getTransactionReceipt(transactionHash);
                if (transactionReceipt === null) {
                    return false;
                }
                const { status: _status } = transactionReceipt;
                status = _status;
                return true;
            } catch (error) {
                return false;
            }
        }, 120000);
        return status === 1;
    } catch (error) {
        return false;
    }
};

async function doJob(mnemonic, week5 = {}, week5_json_path) {
    const wallet1 = ethers.Wallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/0`);//助记词钱包第1个账号 account1
    const wallet2 = ethers.Wallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/1`);//助记词钱包第2个账号 account2
    const wallet3 = ethers.Wallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/2`);//助记词钱包第3个账号 account3

    const from = wallet1.address;
    //用助记词钱包第1个账号地址对应存储每一组钱包任务的回执
    week5[from] = week5[from] ?? ['', '', ''];

    async function doSubJob({ to, value }) {
        let hash = await sendTrans(wallet1.privateKey, { from, to, value });
        if (hash === null) {
            throw (new Error());
        }
        return hash;
    };

    try {
        if (week5[from][0] === '') {
            week5[from][0] = await doSubJob({ to: '0x1ed47146ba443D16F67f489800dc5d7786e07c5d', value: ethers.utils.parseEther('0.0001').toHexString() });
            console.log(wallet1.address, '第一步send...');
            fs.writeFileSync(week5_json_path, JSON.stringify(week5, null, 2));
            await sleep(3000, 5000);
        }
        if (week5[from][1] === '') {
            console.log(wallet1.address, '第二步send...');
            week5[from][1] = await doSubJob({ to: wallet2.address, value: ethers.utils.parseEther('0.0002').toHexString() });
            fs.writeFileSync(week5_json_path, JSON.stringify(week5, null, 2));
            await sleep(3000, 5000);
        }
        if (week5[from][2] === '') {
            console.log(wallet1.address, '第三步send...');
            week5[from][2] = await doSubJob({ to: wallet3.address, value: ethers.utils.parseEther('0.0003').toHexString() });
            fs.writeFileSync(week5_json_path, JSON.stringify(week5, null, 2));
        }
        return true;
    } catch (error) {
        console.log(`钱包交互出现异常`, from, error);
        return false;
    }
};

/**
 * linea voyage 第五周Hapi任务学习脚本，需钱包主账号有超过0.001个测试ETH
 */
(async () => {
    //可自行从infura申请api，如'https://consensys-zkevm-goerli-prealpha.infura.io/v3/自己申请的api' 替换以下rpc配置
    const rpc = 'https://rpc.goerli.linea.build';

    provider = new providers.JsonRpcProvider(rpc);

    //待做Hapi任务的助记词钱包，格式见wallets.json中示例说明
    const wallets_json_path = `${__dirname}/wallets.json`;
    const wallets = json2Obj(fs.readFileSync(wallets_json_path).toString());

    const week5_json_path = `${__dirname}/week5.json`;
    const week5 = fs.existsSync(week5_json_path) ? JSON.parse(fs.readFileSync(week5_json_path).toString()) : {};

    let allIsOk = true;
    for (let mnemonic of wallets) {
        const result = await doJob(mnemonic, week5, week5_json_path);
        if (result === false) {
            allIsOk = false;
        }
        //这里可以等待N秒，再操作下一个钱包
        await sleep(1 * 1000);//例如等待1秒，传值是毫秒，所以乘1000
    }
    if (allIsOk) {
        console.log('任务执行完毕！');
    } else {
        console.log('任务执行中出现异常！可以再次执行任务，程序会自动找到未执行任务的钱包补齐任务。如果网络环境不佳，可以等待网络ok时继续执行');
    }
})();