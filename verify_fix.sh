#!/bin/bash

echo "=========================================="
echo "VERIFICATION TEST - SEPSIS ASSESSMENT FIX"
echo "=========================================="
echo ""
echo "Testing that different inputs produce different backend-calculated results..."
echo ""

# Test 1: Severe Sepsis
echo "TEST 1: Severe Sepsis Input"
echo "----------------------------"
RESPONSE1=$(curl -s -X POST http://localhost:8000/api/patients/PT-4721/assessments \
  -H "Content-Type: application/json" \
  -d '{
    "temperature": 39.5,
    "heart_rate": 130,
    "respiratory_rate": 32,
    "systolic_bp": 78,
    "diastolic_bp": 50,
    "spo2": 86,
    "consciousness": "Pain",
    "wbc": 22.0,
    "lactate": 5.2,
    "creatinine": 3.1
  }')

SCORE1=$(echo "$RESPONSE1" | python3 -c "import sys, json; print(json.load(sys.stdin)['risk_score'])")
LEVEL1=$(echo "$RESPONSE1" | python3 -c "import sys, json; print(json.load(sys.stdin)['risk_level'])")
PROB1=$(echo "$RESPONSE1" | python3 -c "import sys, json; print(json.load(sys.stdin)['ml_probability'])")

echo "✓ Risk Score: $SCORE1"
echo "✓ Risk Level: $LEVEL1"
echo "✓ ML Probability: $PROB1"
echo ""

sleep 2

# Test 2: Normal/Stable
echo "TEST 2: Normal/Stable Input"
echo "----------------------------"
RESPONSE2=$(curl -s -X POST http://localhost:8000/api/patients/PT-4721/assessments \
  -H "Content-Type: application/json" \
  -d '{
    "temperature": 36.9,
    "heart_rate": 74,
    "respiratory_rate": 16,
    "systolic_bp": 122,
    "diastolic_bp": 79,
    "spo2": 98,
    "consciousness": "Alert",
    "wbc": 7.2,
    "lactate": 1.2,
    "creatinine": 0.8
  }')

SCORE2=$(echo "$RESPONSE2" | python3 -c "import sys, json; print(json.load(sys.stdin)['risk_score'])")
LEVEL2=$(echo "$RESPONSE2" | python3 -c "import sys, json; print(json.load(sys.stdin)['risk_level'])")
PROB2=$(echo "$RESPONSE2" | python3 -c "import sys, json; print(json.load(sys.stdin)['ml_probability'])")

echo "✓ Risk Score: $SCORE2"
echo "✓ Risk Level: $LEVEL2"
echo "✓ ML Probability: $PROB2"
echo ""

sleep 2

# Test 3: Moderate
echo "TEST 3: Moderate Risk Input"
echo "----------------------------"
RESPONSE3=$(curl -s -X POST http://localhost:8000/api/patients/PT-4721/assessments \
  -H "Content-Type: application/json" \
  -d '{
    "temperature": 38.1,
    "heart_rate": 102,
    "respiratory_rate": 24,
    "systolic_bp": 96,
    "diastolic_bp": 62,
    "spo2": 93,
    "consciousness": "Alert",
    "wbc": 14.5,
    "lactate": 2.7,
    "creatinine": 1.6
  }')

SCORE3=$(echo "$RESPONSE3" | python3 -c "import sys, json; print(json.load(sys.stdin)['risk_score'])")
LEVEL3=$(echo "$RESPONSE3" | python3 -c "import sys, json; print(json.load(sys.stdin)['risk_level'])")
PROB3=$(echo "$RESPONSE3" | python3 -c "import sys, json; print(json.load(sys.stdin)['ml_probability'])")

echo "✓ Risk Score: $SCORE3"
echo "✓ Risk Level: $LEVEL3"
echo "✓ ML Probability: $PROB3"
echo ""

# Verification
echo "=========================================="
echo "VERIFICATION RESULTS"
echo "=========================================="
echo ""
echo "Test 1 (Severe):   Risk Score = $SCORE1, Level = $LEVEL1"
echo "Test 2 (Normal):   Risk Score = $SCORE2, Level = $LEVEL2"
echo "Test 3 (Moderate): Risk Score = $SCORE3, Level = $LEVEL3"
echo ""

# Check if scores are different
if [ "$SCORE1" != "$SCORE2" ] && [ "$SCORE2" != "$SCORE3" ] && [ "$SCORE1" != "$SCORE3" ]; then
    echo "✅ SUCCESS: All three assessments produced DIFFERENT risk scores"
    echo "   The backend correctly calculates different results for different inputs."
    echo ""
    exit 0
else
    echo "❌ FAILURE: Some assessments produced IDENTICAL risk scores"
    echo "   This indicates the issue persists."
    echo ""
    exit 1
fi
