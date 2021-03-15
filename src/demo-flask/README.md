# Getting started

Start a common Flask project (see the (official doc)[https://flask.palletsprojects.com/en/1.1.x/installation/#install-virtualenv] for details)

```bash
python3 -m venv venv
. venv/bin/activate

pip install -r requirements.txt

FLASK_APP=src/main.py SAASFORM_SERVER='http://localhost:7000' flask run
```

Visit [http://localhost:7000].