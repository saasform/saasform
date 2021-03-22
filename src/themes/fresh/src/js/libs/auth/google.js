const onGoogle = (node) => {
    const google_client_id = "112617093785-v69r982g7f1q742qqe54k8t3gjcdvfu6.apps.googleusercontent.com";
    const auth2 = gapi.auth2.init({ client_id: google_client_id });
    auth2.attachClickHandler(
        node, 
        {}, 
        (googleUser) => onSignin(googleUser), 
        (error) => alert(JSON.stringify(error, undefined, 2))
    );
}

const onSignin = (googleUser) => {
    const _csrf = document.getElementsByName("_csrf")[0].value;
    const idToken = googleUser.getAuthResponse().id_token;
    const data = { _csrf, idToken };

    const method = "POST";
    const url = "/api/v1/google-signin";
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.setRequestHeader("Content-Type", "application/json");
    
    xhr.onreadystatechange = () => {
        if (xhr.readyState == XMLHttpRequest.DONE) {
            if(xhr.status == 302) {
                window.location.href = JSON.parse(xhr.responseText).redirect || '/login';
            } else {
                document.getElementById('error-google').innerHTML = JSON.parse(xhr.responseText).message;
            } 
        }
    };
    
    xhr.send(JSON.stringify(data));
}

(() => {
    gapi.load("auth2", () => onGoogle(document.getElementById("google-signin")));
})();