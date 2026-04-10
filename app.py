from flask import Flask, request, jsonify, render_template

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/calculate_score', methods=['POST'])
def calculate_score():
    data = request.json
    try:
        steps = float(data.get('steps', 0))
        weight = float(data.get('weight', 0))
        height = float(data.get('height', 0))
        water = float(data.get('water', 0))
        calories = float(data.get('calories', 0))
        gender = data.get('gender', 'Male')
    except (TypeError, ValueError):
        return jsonify({'error': 'Invalid data passed'}), 400

    # Steps Score
    steps_score = 10.0 if steps >= 10000 else (steps / 10000.0) * 10
    
    # BMI Score
    bmi_score = 0.0
    if height > 0 and weight > 0:
        height_m = height / 100.0
        bmi = weight / (height_m * height_m)
        if 18.5 <= bmi <= 24.9:
            bmi_score = 10.0
        elif 25.0 <= bmi <= 29.9:
            bmi_score = 3.0
        elif bmi >= 30.0:
            bmi_score = 1.0
        else:
            bmi_score = 3.0 # Underweight
    
    # Water Score
    if water >= 4.0:
        water_score = 10.0
    elif 2.0 <= water < 4.0:
        water_score = 5.0 + (water - 2.0) * 2.5
    else:
        water_score = 2.0
        
    # Calories Score
    target_cal = 2500 if gender == 'Male' else 2000 if gender == 'Female' else 2250
    upper_bound = target_cal * 1.1
    lower_bound = target_cal * 0.9
    
    if lower_bound <= calories <= upper_bound:
        cal_score = 10.0
    else:
        # Deduct 1 pt for every 100 kcal outside
        deviation = calories - upper_bound if calories > upper_bound else lower_bound - calories
        deduction = deviation / 100.0
        cal_score = max(0.0, 10.0 - deduction)
        
    total_score = (steps_score + bmi_score + water_score + cal_score) / 4.0
    
    return jsonify({
        'score': round(total_score, 1),
        'breakdown': {
            'steps': round(steps_score, 1),
            'bmi': round(bmi_score, 1),
            'water': round(water_score, 1),
            'calories': round(cal_score, 1)
        }
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
