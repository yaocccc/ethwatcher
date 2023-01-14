import {ethers} from 'ethers';
import {abi as routerABI} from './abis/routeABI'
import {abi as tokenABI} from './abis/tokenABI'
import {sendMsgToDingDing} from './dingding';
import {tryTimes} from './utils'

const config = {
    uniswapV2Router02: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
    sushiSwapRouter02: '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f',
}

const scanProvider = new ethers.providers.EtherscanProvider('mainnet', "3D9VGNBFTH1KYGY2YIE4YE3EVKGRHGJ4ZT")
const blockChainProvider = new ethers.providers.JsonRpcProvider("https://web3.mytokenpocket.vip");
/** 合约 仅解析使用 不链接provider */
const uniswapV2Router02Contract = new ethers.Contract(config.uniswapV2Router02, routerABI, scanProvider);
const sushiSwapRouter02Contract = new ethers.Contract(config.sushiSwapRouter02, routerABI, scanProvider);
const tokenNameMap = new Map<string, string>(); // Map<address, name>;

const getName = async (address: string): Promise<string> => {
    if (tokenNameMap.has(address.toLowerCase())) return tokenNameMap.get(address.toLowerCase());
    try {
        const tokenContract = new ethers.Contract(address, tokenABI, blockChainProvider);
        const name: string = await tryTimes(() => tokenContract.name(), 3, 1000);
        tokenNameMap.set(address.toLowerCase(), name);
        return name;
    } catch (error) {

    }
    return ""
}

/** 将tx转换为需要的文本 */
const parseTx = async (tx: any): Promise<string[]> => {
    const {hash, from, to, data, timestamp} = tx;
    let parsed: ethers.utils.TransactionDescription;
    let router: string;
    if (to?.toLowerCase() === config.uniswapV2Router02.toLowerCase()) {
        parsed = uniswapV2Router02Contract.interface.parseTransaction({data});
        router = 'uniswap';
    }
    if (to?.toLowerCase() === config.sushiSwapRouter02.toLowerCase()) {
        parsed = sushiSwapRouter02Contract.interface.parseTransaction({data});
        router = 'sushiswap';
    }

    if (!parsed) return ["", ""];

    const lines = [];
    const fromToken = parsed.args[2][0];
    const fromTokenName = await getName(fromToken);
    const toToken = parsed.args[2][parsed.args[2].length - 1];
    const toTokenName = await getName(toToken);
    lines.push(`tx: ${hash}`);
    lines.push(`swap: ${router}`);
    lines.push(`原始代币: ${fromToken} ${fromTokenName}`);
    lines.push(`目标代币: ${toToken} ${toTokenName}`);
    lines.push(`时间: ${new Date(timestamp * 1000).toLocaleString()}`);
    return [lines.join('\n\n'), hash];
}

const run = async () => {
    try {
        const blockNumber = await tryTimes(() => scanProvider.getBlockNumber(), 3, 1000);
        const history: ethers.providers.TransactionResponse[] = [];
        console.log(blockNumber)
        const addresses = ["0x3d74b96f74785d40ce03b99fa578406da5d4c149", "0xd02180861a831e675e1c48087f3037fca65109ab", "0x3d74b96f74785d40ce03b99fa578406da5d4c149"];
        await Promise.all(addresses.map(address => {
            return tryTimes(
                () => scanProvider.getHistory(address, blockNumber - 100),
                3,
                1000
            ).then(res => history.push(...res));
        }));
        
        console.log("history.length: ", history.length);

        for (const tx of history) {
            const parsedTx = await parseTx(tx);
            if (parsedTx[0] != "") 
                await sendMsgToDingDing(parsedTx[0], parseTx[1]);
        }
    } catch (error) {
        console.log(error);
    }
    await new Promise(resolve => setTimeout(resolve, 1000 * 60));
    run();
}

run();
