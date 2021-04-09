function onGoogleStart() {
  gapi.load("auth2", () => {
    const auth2 = gapi.auth2.init();
    const button = document.getElementById("google-signin");
    auth2.attachClickHandler(
      button,
      {},
      (googleUser) => onGoogleSignIn(googleUser),
    );
    gapi.signin2.render(button, button.dataset);
  });
}

function onGoogleSignIn(googleUser) {
  const data = {
    token: googleUser.getAuthResponse().id_token
  };

  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/v1/google-signin');
  xhr.setRequestHeader('Content-Type', 'application/json');

  xhr.onreadystatechange = () => {
    if (xhr.readyState == XMLHttpRequest.DONE) {
      if(xhr.status == 302) {
        window.location.href = JSON.parse(xhr.responseText).redirect || '/';
      } else {
        document.getElementById('error-google').innerHTML = JSON.parse(xhr.responseText).message;
      }
    }
  };

  xhr.send(JSON.stringify(data));
}

window.onGoogleStart = onGoogleStart
