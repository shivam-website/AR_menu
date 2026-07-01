from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import json
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Mock restaurant data
RESTAURANTS = {
    123: {
        "id": 123,
        "name": "Namaste Kitchen",
        "location": "Kathmandu",
        "image": "https://via.placeholder.com/300x300?text=Namaste+Kitchen"
    }
}

# Mock menu data
MENU = {
    123: [
        {
            "id": 1,
            "name": "Momo",
            "description": "6 pieces of steamed dumplings",
            "price": 120,
            "image": "https://via.placeholder.com/300x300?text=Momo",
            "color": "#D4A574",
            "model": "/static/models/momo.glb"
        },
        {
            "id": 2,
            "name": "Chowmein",
            "description": "Stir-fried noodles",
            "price": 150,
            "image": "https://via.placeholder.com/300x300?text=Chowmein",
            "color": "#FDB750",
            "model": "/models/chowmein.glb"
        },
        {
            "id": 3,
            "name": "Panipuri",
            "description": "5 pieces of crispy shells with tamarind water",
            "price": 80,
            "image": "https://via.placeholder.com/300x300?text=Panipuri",
            "color": "#C5644C",
            "model": "/models/panipuri.glb"
        },
        {
            "id": 4,
            "name": "Dal Bhat",
            "description": "Rice with lentil curry",
            "price": 200,
            "image": "https://via.placeholder.com/300x300?text=DalBhat",
            "color": "#A0826D",
            "model": "/models/dalbhat.glb"
        },
        {
            "id": 5,
            "name": "Samosa",
            "description": "3 pieces of crispy pastry",
            "price": 60,
            "image": "https://via.placeholder.com/300x300?text=Samosa",
            "color": "#D2691E",
            "model": "/models/samosa.glb"
        }
    ]
}

# Routes

@app.route('/')
def index():
    """Main app page"""
    return render_template('index.html')

@app.route('/ar', methods=['GET'])
def ar_page():
    """AR page - same as index, params handled by JS"""
    return render_template('index.html')

@app.route('/api/restaurant/<int:restaurant_id>', methods=['GET'])
def get_restaurant(restaurant_id):
    """Get restaurant details"""
    restaurant = RESTAURANTS.get(restaurant_id)
    if not restaurant:
        return jsonify({'error': 'Restaurant not found'}), 404
    return jsonify(restaurant)

@app.route('/api/menu/<int:restaurant_id>', methods=['GET'])
def get_menu(restaurant_id):
    """Get all dishes for a restaurant"""
    menu = MENU.get(restaurant_id)
    if menu is None:
        return jsonify({'error': 'Menu not found'}), 404
    return jsonify(menu)

@app.route('/api/dish/<int:restaurant_id>/<int:dish_id>', methods=['GET'])
def get_dish(restaurant_id, dish_id):
    """Get specific dish details"""
    menu = MENU.get(restaurant_id)
    if not menu:
        return jsonify({'error': 'Restaurant not found'}), 404
    
    dish = next((d for d in menu if d['id'] == dish_id), None)
    if not dish:
        return jsonify({'error': 'Dish not found'}), 404
    
    return jsonify(dish)

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat()})

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def server_error(error):
    return jsonify({'error': 'Server error'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8000)