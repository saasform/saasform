function onGoogleStart() {
  gapi.load("auth2", () => {
    const button = document.getElementById("google-signin");
    button.onclick = function() {
      gapi.auth2.authorize({
        access_type: 'offline',
        response_type: 'code id_token permission'
      }, onGoogleSignIn)
    };
  });
}

function onGoogleSignIn(data) {
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
