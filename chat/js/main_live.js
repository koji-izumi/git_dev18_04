// ビデオチャットのAPI実装
const Peer = window.Peer;
const param = location.search.substring(4);
const newCommentRef = firebase.database().ref(`liveList/${param}/comment`);
const remLiveRef = firebase.database().ref(`liveList/${param}`);
const newViewerRef = firebase.database().ref(`liveList/${param}/viewer`);


$(".live-id").html(`ID:${param}`);
(async function main() {
    const localVideo = document.getElementById('js-local-stream');
    const joinTrigger = document.getElementById('js-join-trigger');
    const remoteVideos = document.getElementById('js-remote-streams');
    const localText = document.getElementById('js-local-text');
    const sendTrigger = document.getElementById('js-send-trigger');
    const messages = document.getElementById('js-messages');
    const name = document.getElementById('js-name');


    const localStream = await navigator.mediaDevices
        .getUserMedia({
            audio: true,
            video: true,
        })
        .catch(console.error);

    // Render local stream
    localVideo.muted = true;
    localVideo.srcObject = localStream;
    localVideo.playsInline = true;
    await localVideo.play().catch(console.error);

    // eslint-disable-next-line require-atomic-updates
    const peer = (window.peer = new Peer({
        key: '37baabbe-bb24-4d6a-9168-c72cb0f71412',
        debug: 3,
    }));

    // Register join handler
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


        // for closing room members
        room.on('peerLeave', peerId => {
            const remoteVideo = remoteVideos.querySelector(
                `[data-peer-id="${peerId}"]`
            );
            remoteVideo.srcObject.getTracks().forEach(track => track.stop());
            remoteVideo.srcObject = null;
            remoteVideo.remove();

        });


        sendTrigger.addEventListener('click', onClickSend);

        function onClickSend() {
            // Send message to all of the peers in the room via websocket

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
        
        newViewerRef.on("child_added", function (data) {
            let s = data.val();
            let viewerInsert = `
                    <p>${s.viewername}さんが視聴を開始しました</p>
                `
            $(".messages").append(viewerInsert);
            messages.scrollTop = messages.scrollHeight;
        })

        newCommentRef.on("child_added", function (data) {
            let v = data.val();
            let commentInsert = `
                    <p>${v.username}: ${v.comment}</p>
                `
            $(".messages").append(commentInsert);
        })
    });
    // for closing myself
    $("#js-leave-trigger").on('click', function () {
        if (confirm("配信を終了しますか？")) {
            remLiveRef.remove();
            window.close();
        } else {
            ;
        }
    });
    // 閉じるボタン押下時にFirebaseから削除
    window.onbeforeunload = function () {
        remLiveRef.remove();
    }

    peer.on('error', console.error);
})();
// ここまでビデオチャットの実装

