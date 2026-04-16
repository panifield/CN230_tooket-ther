from flask import Flask, render_template

def create_app():
    # Flask looks for the 'templates' folder by default
    app = Flask(__name__)

    @app.get("/")
    def root():
        return render_template("index.html")

    @app.get("/login")
    def login():
        return render_template("login.html")

    @app.get("/booking")
    def book_now():
        return render_template("booking.html")

    @app.get("/my-tickets")
    def my_tickets():
        # Using the singular 'my_ticket.html' as seen in your sidebar
        return render_template("my_ticket.html")

    @app.get("/organizer")
    def organizer():
        # CHANGED: Now renders your actual dashboard file
        return render_template("organizer/dashboard.html")

    @app.get("/checker")
    def checker():
        # CHANGED: Now renders your checker file
        return render_template("checker.html")
    
    @app.get("/payment")
    def payment():
        return render_template("payment.html")
    
    @app.get("/zones")
    def zones():
        # IMPORTANT: If zones.html is inside the 'organizer' folder, 
        # you must include the folder name like this:
        return render_template("organizer/zones.html")

    @app.get("/post-purchase")
    def post_purchase():
        return render_template("post_purchase.html")

    return app

app = create_app()

if __name__ == "__main__":
    # debug=True is your best friend for catching errors early!
    app.run(host="0.0.0.0", port=5000, debug=True)