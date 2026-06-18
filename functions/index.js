// 채팅 메시지가 추가되면 같은 방의 다른 가족 구성원에게 FCM 푸시를 보낸다.
// 트리거: rooms/{roomCode}/chat/main 문서의 messages 배열에 새 항목이 생길 때.
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

exports.notifyChatMessage = onDocumentWritten(
  {
    document: "rooms/{roomCode}/chat/main",
    region: "asia-northeast3",
    memory: "256MiB",   // 최소 메모리
    maxInstances: 5,    // 비용 상한: 폭주해도 동시 5개까지만
  },
  async (event) => {
    const beforeData = event.data.before.exists ? event.data.before.data() : null;
    const afterData = event.data.after.exists ? event.data.after.data() : null;
    if (!afterData) return;

    const beforeMsgs = (beforeData && beforeData.messages) || [];
    const afterMsgs = afterData.messages || [];
    if (afterMsgs.length <= beforeMsgs.length) return; // 새 메시지가 아님 (수정/삭제 등)

    const newMsg = afterMsgs[afterMsgs.length - 1];
    if (!newMsg) return;

    const roomCode = event.params.roomCode;
    const db = getFirestore();
    const roomSnap = await db.collection("rooms").doc(roomCode).get();
    if (!roomSnap.exists) return;

    const tokensMap = roomSnap.data().fcmTokens || {};
    // 보낸 사람(byId) 제외한 (deviceId, token) 목록
    const entries = Object.entries(tokensMap)
      .filter(([deviceId, token]) => deviceId !== newMsg.byId && !!token);
    if (entries.length === 0) return;

    const tokens = entries.map(([, token]) => token);

    const res = await getMessaging().sendEachForMulticast({
      tokens,
      notification: {
        title: `💬 ${newMsg.by || "가족"}`,
        body: newMsg.text || "새 메시지가 도착했어요",
      },
      android: {
        priority: "high",
        notification: { channelId: "default" },
      },
    });

    // 더 이상 유효하지 않은 토큰은 방 문서에서 제거
    const FieldValue = require("firebase-admin/firestore").FieldValue;
    const updates = {};
    res.responses.forEach((r, i) => {
      if (!r.success) {
        const code = r.error && r.error.code;
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token" ||
          code === "messaging/invalid-argument"
        ) {
          const deviceId = entries[i][0];
          updates[`fcmTokens.${deviceId}`] = FieldValue.delete();
        }
      }
    });
    if (Object.keys(updates).length) {
      await db.collection("rooms").doc(roomCode).update(updates).catch(() => {});
    }
  }
);
