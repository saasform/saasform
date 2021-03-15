from flask import Flask

app = Flask(__name__)

# Begin Saasform code
import requests
import os
import json
from flask_login import LoginManager, login_required, UserMixin, current_user
import jwt

# Setting up secrets for the session
import secrets
secret = secrets.token_urlsafe(32)
app.secret_key = secret

# The user required by flask-login must have a set of properties.
# You can inherit from UserMixin to have all the required properies.
class SaasformUser(UserMixin):
    account_id = 0
    email = ''


# Fetch public key from Saasform. You can also pass this from config file
uri = os.environ['SAASFORM_SERVER'] + '/api/v1/public-key'
pubkey = requests.get(uri).json()['message']


# Creating login manager
login_manager = LoginManager()

# Redirect to Saasform to authenticate if unauthorized
login_manager.login_view = os.environ['SAASFORM_SERVER'] + "/login"

# Custom handler to parse Saasform response
@login_manager.request_loader
def load_user_from_request(request):
    app.logger.debug(request)

    token = request.cookies.get('__session')
    if token:
        # validating JWT
        try:
            data = jwt.decode(token, pubkey, algorithms=['ES256'])
        except:
            app.logger.error('JWT validation failed')
            return None

        # flask-login requires a user to be returned.
        # Here we can also replicate the user on out local DB to locally have the list of users
        user = SaasformUser()
        user.email = data.get('email', '')
        user.account_id = data.get('account_id', 0)

        return user
    
    # Token not found, user not autheticated
    return None

login_manager.init_app(app)
# End Saasform code

@app.route("/")
def hello():
    return "Hello, World!"

@app.route("/protected")
@login_required
def protected():
    return "Hello, " + current_user.email
