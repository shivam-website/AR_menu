from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
from datetime import datetime
import uuid

app = Flask(__name__)
CORS(app)

RESTAURANTS = {
    123: {
        "id": 123,
        "name": "Namaste Kitchen",
        "tagline": "Authentic Nepali Cuisine",
        "location": "Thamel, Kathmandu",
        "rating": 4.8,
        "image": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80"
    }
}

MENU = {
    123: [
        {
            "id": 1,
            "name": "Momo",
            "description": "Handcrafted steamed dumplings filled with seasoned buffalo mince, served with our signature tomato achar. A Kathmandu classic.",
            "price": 120,
            "image": "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&q=80",
            "color": "#D4A574",
            "model": "/static/models/momo.glb",
            "category": "Appetizer",
            "badge": "Chef's Special"
        },
        {
            "id": 2,
            "name": "Chowmein",
            "description": "Wok-tossed egg noodles with fresh vegetables, soy glaze, and aromatic spices. Served sizzling hot.",
            "price": 150,
            "image": "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&q=80",
            "color": "#FDB750",
            "model": "/static/models/chowmein.glb",
            "category": "Main Course",
            "badge": "Popular"
        },
        {
            "id": 3,
            "name": "Panipuri",
            "description": "Five crispy hollow shells filled with spiced potato and chickpeas, served with tangy tamarind water.",
            "price": 80,
            "image": "https://images.unsplash.com/photo-1586357507341-3fbe59f2a5d9?q=80&w=880&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
            "color": "#C5644C",
            "model": "/static/models/panipuri.glb",
            "category": "Street Food",
            "badge": "Best Seller"
        },
        {
            "id": 4,
            "name": "Dal Bhat",
            "description": "The quintessential Nepali meal — steamed basmati rice with lentil curry, seasonal vegetable, pickle, and crispy papad.",
            "price": 200,
            "image": "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80",
            "color": "#A0826D",
            "model": "/static/models/dalbhat.glb",
            "category": "Main Course",
            "badge": "Traditional"
        },
        {
            "id": 5,
            "name": "Samosa",
            "description": "Golden-fried triangular pastries stuffed with spiced potatoes, peas, and cumin. Served with mint chutney.",
            "price": 60,
            "image": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80",
            "color": "#D2691E",
            "model": "/static/models/samosa.glb",
            "category": "Appetizer",
            "badge": "Crispy"
        }
    ]
}

orders = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/ar')
def ar_page():
    return render_template('index.html')

@app.route('/api/restaurant/<int:restaurant_id>', methods=['GET'])
def get_restaurant(restaurant_id):
    restaurant = RESTAURANTS.get(restaurant_id)
    if not restaurant:
        return jsonify({'error': 'Restaurant not found'}), 404
    return jsonify(restaurant)

@app.route('/api/menu/<int:restaurant_id>', methods=['GET'])
def get_menu(restaurant_id):
    menu = MENU.get(restaurant_id)
    if menu is None:
        return jsonify({'error': 'Menu not found'}), 404
    return jsonify(menu)

@app.route('/api/dish/<int:restaurant_id>/<int:dish_id>', methods=['GET'])
def get_dish(restaurant_id, dish_id):
    menu = MENU.get(restaurant_id)
    if not menu:
        return jsonify({'error': 'Restaurant not found'}), 404
    dish = next((d for d in menu if d['id'] == dish_id), None)
    if not dish:
        return jsonify({'error': 'Dish not found'}), 404
    return jsonify(dish)

@app.route('/api/order', methods=['POST'])
def place_order():
    data = request.get_json()
    if not data or 'items' not in data:
        return jsonify({'error': 'No items provided'}), 400

    order_id = str(uuid.uuid4())[:8]
    restaurant_id = data.get('restaurant_id', 123)
    items = data['items']

    total = sum(item['price'] * item['qty'] for item in items)

    order = {
        'id': order_id,
        'restaurant_id': restaurant_id,
        'items': items,
        'total': total,
        'status': 'confirmed',
        'created_at': datetime.now().isoformat()
    }

    orders[order_id] = order
    return jsonify({'order_id': order_id, 'total': total, 'status': 'confirmed'})

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat()})

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def server_error(error):
    return jsonify({'error': 'Server error'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8000)
