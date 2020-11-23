
const newDataRef = firebase.database().ref('liveList');

function start() {
    let liveTitle = window.prompt("配信タイトルを入力してください", "");
    let unique = uniqueID();
    function addlive() {
        newDataRef.child(`${unique}`).set({
            liveName: liveTitle,
            liveId: unique,
            liveURL: "live.html?id="+unique,
        })
    }

    if (liveTitle == null || liveTitle == '') {
        ;
    } else {
        window.open("live.html" + "?id=" + unique, "_blank");
        addlive();
    }
};

function uniqueID() {
    let random = Math.floor(Math.random() * 1000);
    let date = new Date();
    let time = date.getTime();
    return random + time.toString();
};

$(".start-btn").on("click", start);

newDataRef.on("child_added", function (data) {
    let v = data.val();
    console.log(v);
    let liveJump = `
<div class="live-select">
    <a href="watch.html?id=${v.liveId}" target="blank" id="${v.liveId}">
        <img src="imgs/videostart.png">
        <p>${v.liveName}</p>
    </a>
</div>
`
    $(".main-list").append(liveJump);
})