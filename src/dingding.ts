import axios from "axios"
import {tryTimes} from "./utils";

const sended = new Set<string>();

/** 将消息发送到dingding webhoo */
const startat = Date.now();
const sendMsgToDingDing = async (msg: string, hash: string) => {
        if (msg == "") return;
    if (sended.has(hash)) return;

    const webhook = process.env.DDWEBHOOK;
    const body = {
        actionCard: {
            title: "Tony老师说:",
            text: msg,
            btnOrientation: "0",
        },
        msgtype: "actionCard"
    };

    try {
        if (Date.now() - startat > 1000 * 60) { // 启动时的1分钟不播报
            const res = await tryTimes(() => axios.post(webhook, body), 3, 20 * 1000);
            console.log(res);
        } 
        sended.add(hash);
    } catch (e) {

    }
}

export {
    sendMsgToDingDing
}
