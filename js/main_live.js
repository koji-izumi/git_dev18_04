// ビデオチャットのAPI実装
const Peer = window.Peer;
const param = location.search.substring(4);　//URLのパラメータを取得
// Firebaseのリファレンスを取得
const newCommentRef = firebase.database().ref(`liveList/${param}/comment`);
const LiveRef = firebase.database().ref(`liveList/${param}`);
const newViewerRef = firebase.database().ref(`liveList/${param}/viewer`);

// 配信タイトルを画面左上に表示
LiveRef.once('value',function(snapshot){
    const liveTitle=snapshot.val().liveName;
    $(".live-title").html(liveTitle);
});

(async function main() {
    const localVideo = document.getElementById('js-local-stream');
    const joinTrigger = document.getElementById('js-join-trigger');
    const remoteVideos = document.getElementById('js-remote-streams');
    const localText = document.getElementById('js-local-text');
    const sendTrigger = document.getElementById('js-send-trigger');
    const messages = document.getElementById('js-messages');
    const name = document.getElementById('js-name');

    // ビデオの設定
    const localStream = await navigator.mediaDevices
        .getUserMedia({
            audio: true,
            video: true,
        })
        .catch(console.error);

    localVideo.muted = true;
    localVideo.srcObject = localStream;
    localVideo.playsInline = true;
    await localVideo.play().catch(console.error);

    // APIキーを設定
    const peer = (window.peer = new Peer({
        key: '37baabbe-bb24-4d6a-9168-c72cb0f71412',
        debug: 3,
    }));

    // 配信開始ボタン押下時の処理
    joinTrigger.addEventListener('click', () => {
        // Note that you need to ensure the peer has connected to signaling server
        // before using methods of peer instance.
        if (!peer.open) {
            return;
        }

        const room = peer.joinRoom(param, {
            mode: 'sfu',
            stream: localStream,
        });

        // 配信開始ボタン押下時にメッセージを表示し、配信画面のCSSを変更
        let startText = `<p>配信を開始しました</p>`;
        $(".messages").append(startText);
        messages.scrollTop = messages.scrollHeight;
        $("#js-local-stream").css("opacity", "1");
        $("#js-join-trigger").css("visibility", "hidden");
        $("#js-leave-trigger").css("visibility", "visible");

        // Render remote stream for new peer join in the room
        room.on('stream', async stream => {
            const newVideo = document.createElement('video');
            newVideo.srcObject = stream;
            newVideo.playsInline = true;
            // mark peerId to find it later at peerLeave event
            newVideo.setAttribute('data-peer-id', stream.peerId);
            remoteVideos.append(newVideo);
            await newVideo.play().catch(console.error);
        });


        sendTrigger.addEventListener('click', onClickSend);

        function onClickSend() {
            // コメント送信時の処理

            newCommentRef.push({
                username: name.value,
                comment: localText.value
            })
            room.send(localText.value);
            if (name.value == '' || localText.value == '') {
                ;
            }
            localText.value = '';
            messages.scrollTop = messages.scrollHeight;
        }

        // 新しい視聴者が加わったときの処理
        newViewerRef.endAt().limitToLast(1).on("child_added", function (data) {
            let s = data.val();
            let viewerInsert = `
                    <p>${s.viewername}さんが視聴を開始しました</p>
                `
            $(".messages").append(viewerInsert);
            messages.scrollTop = messages.scrollHeight;
        })

        //　視聴者が増えたときに画面右上の視聴人数を更新
        newViewerRef.on("child_added", function(){
            newViewerRef.once("value", function(snapshot){
                let viewerNum = snapshot.numChildren();
                const viewerNumInsert =`
                <p>${viewerNum}人が視聴中</p>
                `
                $("#viewer-num").html(viewerNumInsert);
            })
        })

        //　視聴者が減ったときに画面右上の視聴人数を更新
        newViewerRef.on("child_removed", function(){
            newViewerRef.once("value", function(snapshot){
                let viewerNum = snapshot.numChildren();
                const viewerNumInsert =`
                <p>${viewerNum}人が視聴中</p>
                `
                $("#viewer-num").html(viewerNumInsert);
            })
        })

        // コメントが送信されたときの処理
        newCommentRef.on("child_added", function (data) {
            let v = data.val();
            let commentInsert = `
                    <p>${v.username}: ${v.comment}</p>
                `
            $(".messages").append(commentInsert);
        })
    });
    // 配信を終了するときにウィンドウを閉じ、Firebaseから削除
    $("#js-leave-trigger").on('click', function () {
        if (confirm("配信を終了しますか？")) {
            LiveRef.remove();
            window.close();
        } else {
            ;
        }
    });
    // 閉じるボタン押下時にFirebaseから削除
    window.onbeforeunload = function () {
        LiveRef.remove();
    }
    peer.on('error', console.error);
})();

