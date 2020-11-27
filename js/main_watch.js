// ビデオチャットのAPI実装
const Peer = window.Peer;
const param = location.search.substring(4); //URLのパラメータを取得
// Firebaseのリファレンスを取得
const newCommentRef = firebase.database().ref(`liveList/${param}/comment`);
const newDataRef = firebase.database().ref(`liveList/${param}`);
const newViewerRef = firebase.database().ref(`liveList/${param}/viewer`);
const dbRef = firebase.database().ref('liveList');

// 配信タイトルを画面左上に表示
newDataRef.once('value',function(snapshot){
    const liveTitle=snapshot.val().liveName;
    $(".live-title").html(liveTitle);
});

(async function main() {
    const joinTrigger = document.getElementById('js-join-trigger');
    const remoteVideos = document.getElementById('js-remote-streams');
    const localText = document.getElementById('js-local-text');
    const sendTrigger = document.getElementById('js-send-trigger');
    const messages = document.getElementById('js-messages');
    const enterName = document.getElementById('js-enter-name');
    const name = document.getElementById('js-name');


    // APIキーを設定
    const peer = (window.peer = new Peer({
        key: '37baabbe-bb24-4d6a-9168-c72cb0f71412',
        debug: 3,
    }));

    // 視聴開始ボタン押下時の処理
    joinTrigger.addEventListener('click', () => {
        // Note that you need to ensure the peer has connected to signaling server
        // before using methods of peer instance.
        if (!peer.open) {
            return;
        }

        const room = peer.joinRoom(param, {
            mode: 'sfu',
        });

        // 視聴者をFirebaseに追加（キーを取得）
        const viewerPush = newViewerRef.push({
            viewername: enterName.value,
        });
        const viewerKey = viewerPush.getKey();

        // 視聴者が追加されたらメッセージを表示
        newViewerRef.endAt().limitToLast(1).on("child_added", function (data) {
            let s = data.val();
            let viewerInsert = `
            <p>${s.viewername}さんが視聴を開始しました</p>
        `
            $(".messages").append(viewerInsert);
            messages.scrollTop = messages.scrollHeight;
        })
        // 視聴開始時に入力された名前をコメント入力エリアに入力
        $("#js-name").val(enterName.value);

        // 視聴開始ボタンを非表示にし、退室ボタンを表示
        $(".enter").css("visibility", "hidden");
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

        // 配信終了のときの処理
        dbRef.on("child_removed", function () {
            dbRef.orderByKey().equalTo(param).once('value', function (snapshot) {
                if (snapshot.exists()) {
                    ;
                } else {
                    alert('配信が終了しました');
                    window.close();
                }
            })
        });

        // 退室ボタンを押したときにFirebaseから削除
        $("#js-leave-trigger").on('click', function () {
            if (confirm("退室しますか？")) {
                newViewerRef.child(viewerKey).remove();
                window.close();
            } else {
                ;
            }
        });

        // ウィンドウを閉じたときにFirebaseから削除
        window.onbeforeunload = function(){
            newViewerRef.child(viewerKey).remove();
        }

        sendTrigger.addEventListener('click', onClickSend);

        function onClickSend() {
            /// コメント送信時の処理

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

        $("#js-local-text").on("keydown", function (event) {
            if(event.keyCode==13){
              onClickSend();
            }  
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
            messages.scrollTop = messages.scrollHeight;
        })

    });

    peer.on('error', console.error);
})();