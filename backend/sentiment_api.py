# API Flask pour la classification de sentiments 

from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import os

app = Flask(__name__)
CORS(app)

MODEL_DIR = "sentiment_models"

print("Chargement des modèles...")

# best_model.pkl  
with open(os.path.join(MODEL_DIR, "best_model.pkl"), "rb") as f:
    model = pickle.load(f)

# métadonnées
metadata_path = os.path.join(MODEL_DIR, "model_metadata.pkl")
metadata = {}
if os.path.exists(metadata_path):
    with open(metadata_path, "rb") as f:
        metadata = pickle.load(f)

print("✓ Modèles chargés avec succès")


@app.route("/ping", methods=["GET"])
def ping():
    return jsonify({"message": "API opérationnelle ✓"})


@app.route("/model-info", methods=["GET"])
def model_info():
    return jsonify(metadata)


@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json(silent=True) or {}
        text = data.get("text", "")

        if not isinstance(text, str) or not text.strip():
            return jsonify({"error": "Aucun texte fourni"}), 400

        
        prediction = model.predict([text])[0]

        probabilities = {}
        if hasattr(model, "predict_proba"):
            probs = model.predict_proba([text])[0]
            classes = list(getattr(model, "classes_", []))
            probabilities = {str(c): float(p) for c, p in zip(classes, probs)}

        return jsonify({
            "input": text,
            "prediction": str(prediction),
            "probabilities": probabilities
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/predict-batch", methods=["POST"])
def predict_batch():
    try:
        data = request.get_json(silent=True) or {}
        texts = data.get("texts", [])

        if not isinstance(texts, list) or len(texts) == 0:
            return jsonify({"error": "Liste de textes invalide"}), 400

     
        clean_texts = [t for t in texts if isinstance(t, str) and t.strip()]
        if len(clean_texts) == 0:
            return jsonify({"error": "Aucun texte valide"}), 400

        preds = model.predict(clean_texts)

        probs_list = None
        if hasattr(model, "predict_proba"):
            probs = model.predict_proba(clean_texts)
            classes = list(getattr(model, "classes_", []))
            probs_list = [
                {str(c): float(p) for c, p in zip(classes, row)}
                for row in probs
            ]

        results = []
        for i, t in enumerate(clean_texts):
            item = {"input": t, "prediction": str(preds[i])}
            if probs_list is not None:
                item["probabilities"] = probs_list[i]
            results.append(item)

        return jsonify({"results": results})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
