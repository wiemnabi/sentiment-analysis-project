import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const SentimentAnalyzer = () => {
  const [activeTab, setActiveTab] = useState('single');
  const [text, setText] = useState('');
  const [batchTexts, setBatchTexts] = useState('');
  const [result, setResult] = useState(null);
  const [batchResults, setBatchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiStatus, setApiStatus] = useState('checking');
  const [modelInfo, setModelInfo] = useState(null);

  const API_URL = "http://127.0.0.1:5000"

  // Couleurs pour les sentiments
  const SENTIMENT_COLORS = {
    positive: '#10b981',
    negative: '#ef4444',
    neutral: '#f59e0b'
  };

  // pour Vérifier le status de l'API au chargement
  useEffect(() => {
    checkApiStatus();
    fetchModelInfo();
  }, []);

  const checkApiStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/ping`);
      if (response.ok) {
        setApiStatus('connected');
      } else {
        setApiStatus('error');
      }
    } catch (err) {
      setApiStatus('disconnected');
    }
  };

  const fetchModelInfo = async () => {
    try {
      const response = await fetch(`${API_URL}/model-info`);
      if (response.ok) {
        const data = await response.json();
        setModelInfo(data);
      }
    } catch (err) {
      console.error('Erreur lors de la récupération des infos du modèle:', err);
    }
  };

  const analyzeSentiment = async () => {
    if (!text.trim()) {
      setError('Veuillez entrer un texte à analyser');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'analyse');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const analyzeBatch = async () => {
    const texts = batchTexts
      .split('\n')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    if (texts.length === 0) {
      setError('Veuillez entrer au moins un texte (un par ligne)');
      return;
    }

    setLoading(true);
    setError(null);
    setBatchResults([]);

    try {
      const response = await fetch(`${API_URL}/predict-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ texts }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'analyse batch');
      }

      const data = await response.json();
      setBatchResults(data.results);
    } catch (err) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const getSentimentIcon = (sentiment) => {
    const icons = {
      positive: '😊',
      negative: '😞',
      neutral: '😐'
    };
    return icons[sentiment?.toLowerCase()] || '🤔';
  };

  const getSentimentBadgeColor = (sentiment) => {
    const colors = {
      positive: 'bg-green-100 text-green-800 border-green-300',
      negative: 'bg-red-100 text-red-800 border-red-300',
      neutral: 'bg-yellow-100 text-yellow-800 border-yellow-300'
    };
    return colors[sentiment?.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-300';
  };
const getMaxConfidence = (probabilities) => {
  if (!probabilities || Object.keys(probabilities).length === 0) return null;
  return Math.max(...Object.values(probabilities)) * 100;
};

  const getApiStatusBadge = () => {
    const badges = {
      connected: { text: 'API Connectée', color: 'bg-green-500' },
      checking: { text: 'Vérification...', color: 'bg-yellow-500' },
      disconnected: { text: 'API Déconnectée', color: 'bg-red-500' },
      error: { text: 'Erreur API', color: 'bg-red-500' }
    };
    const badge = badges[apiStatus];
    return (
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${badge.color} animate-pulse`}></div>
        <span className="text-sm text-gray-600">{badge.text}</span>
      </div>
    );
  };

  const renderProbabilityChart = (probabilities) => {
    if (!probabilities || Object.keys(probabilities).length === 0) return null;

  const data = Object.entries(probabilities).map(([sentiment, prob]) => ({
    name: sentiment.charAt(0).toUpperCase() + sentiment.slice(1),
    value: Number((prob * 100).toFixed(2)),
    percentage: prob
  }));

    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Probabilités par Sentiment</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Graphique en barres */}
          <div className="bg-white p-4 rounded-lg shadow">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `${value}%`} />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Graphique circulaire */}
          <div className="bg-white p-4 rounded-lg shadow">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="55%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={75}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={SENTIMENT_COLORS[entry.name.toLowerCase()]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Barres de progression */}
        <div className="mt-4 space-y-3">
          {Object.entries(probabilities).map(([sentiment, prob]) => (
            <div key={sentiment}>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">
                  {getSentimentIcon(sentiment)} {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {(prob * 100).toFixed(2)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="h-2.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${prob * 100}%`,
                    backgroundColor: SENTIMENT_COLORS[sentiment]
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderBatchStatistics = () => {
    if (batchResults.length === 0) return null;

    const sentimentCounts = batchResults.reduce((acc, result) => {
      const sentiment = result.prediction.toLowerCase();
      acc[sentiment] = (acc[sentiment] || 0) + 1;
      return acc;
    }, {});

    const chartData = Object.entries(sentimentCounts).map(([sentiment, count]) => ({
      name: sentiment.charAt(0).toUpperCase() + sentiment.slice(1),
      count,
      percentage: ((count / batchResults.length) * 100).toFixed(1)
    }));

    return (
      <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg">
        <h3 className="text-xl font-bold mb-4 text-gray-800">📊 Statistiques Globales</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {Object.entries(sentimentCounts).map(([sentiment, count]) => (
            <div key={sentiment} className="bg-white p-4 rounded-lg shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl mb-2">{getSentimentIcon(sentiment)}</p>
                  <p className="text-sm text-gray-600 capitalize">{sentiment}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold" style={{ color: SENTIMENT_COLORS[sentiment] }}>
                    {count}
                  </p>
                  <p className="text-sm text-gray-500">
                    {((count / batchResults.length) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#3b82f6" name="Nombre d'avis" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const exampleTexts = [
    "This product is absolutely amazing! Best purchase ever!",
    "Terrible quality. Waste of money. Very disappointed.",
    "It's okay, nothing special but works fine."
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-3">
            🎯 Analyseur de Sentiments
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            Système de classification de sentiments basé sur l'IA
          </p>
          {getApiStatusBadge()}
        </div>

        {/* Model Info Card */}
        {modelInfo && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">ℹ️ Informations sur le Modèle</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-sm text-gray-600">Modèle</p>
                <p className="font-semibold text-gray-800">{modelInfo.model_name}</p>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <p className="text-sm text-gray-600">Précision</p>
                <p className="font-semibold text-gray-800">{(modelInfo.accuracy * 100).toFixed(2)}%</p>
              </div>
              <div className="bg-purple-50 p-3 rounded">
                <p className="text-sm text-gray-600">F1-Score</p>
                <p className="font-semibold text-gray-800">{(modelInfo.f1_score * 100).toFixed(2)}%</p>
              </div>
              <div className="bg-yellow-50 p-3 rounded">
                <p className="text-sm text-gray-600">Features</p>
                <p className="font-semibold text-gray-800">{modelInfo.feature_count}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
          <div className="flex border-b">
            <button
              className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                activeTab === 'single'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              onClick={() => setActiveTab('single')}
            >
              📝 Analyse Simple
            </button>
            <button
              className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                activeTab === 'batch'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              onClick={() => setActiveTab('batch')}
            >
              📊 Analyse Batch
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'single' ? (
              <>
                {/* Single Analysis */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Entrez votre texte à analyser
                  </label>
                  <textarea
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows="6"
                    placeholder="Entrez un avis client, un commentaire, ou n'importe quel texte..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </div>

                {/* Example buttons */}
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Exemples rapides :</p>
                  <div className="flex flex-wrap gap-2">
                    {exampleTexts.map((example, index) => (
                      <button
                        key={index}
                        className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                        onClick={() => setText(example)}
                      >
                        Exemple {index + 1}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={analyzeSentiment}
                  disabled={loading || !text.trim()}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Analyse en cours...
                    </span>
                  ) : (
                    '🚀 Analyser le Sentiment'
                  )}
                </button>

                {/* Error Display */}
                {error && (
                  <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    ❌ {error}
                  </div>
                )}

                {/* Results */}
                {result && (
                  <div className="mt-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 animate-fadeIn">
                    <h2 className="text-2xl font-bold mb-4 text-gray-800">
                      📈 Résultat de l'Analyse
                    </h2>

                    {/* Main Result */}
                    <div className="bg-white rounded-lg p-6 shadow-md mb-4">
                     <div className="flex items-center justify-between mb-4">
  <h3 className="text-lg font-semibold text-gray-700">Sentiment Détecté</h3>

  <div className="flex items-center gap-4">
    {getMaxConfidence(result.probabilities) !== null && (
      <div className="text-right">
        <p className="text-xs text-gray-500">Confiance</p>
        <p className="text-lg font-bold">
          {getMaxConfidence(result.probabilities).toFixed(1)}%
        </p>
      </div>
    )}

    <div className={`px-4 py-2 rounded-full border-2 ${getSentimentBadgeColor(result.prediction)}`}>
      <span className="text-2xl mr-2">{getSentimentIcon(result.prediction)}</span>
      <span className="font-bold text-lg capitalize">{result.prediction}</span>
    </div>
  </div>
</div>


                      <div className="border-t pt-4">
                        <p className="text-sm text-gray-600 mb-2">Texte analysé :</p>
                        <p className="text-gray-800 italic bg-gray-50 p-3 rounded">"{result.input}"</p>
                      </div>
                    </div>

                    {/* Probabilities */}
                    {renderProbabilityChart(result.probabilities)}
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Batch Analysis */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Entrez plusieurs textes (un par ligne)
                  </label>
                  <textarea
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
                    rows="10"
                    placeholder="Texte 1&#10;Texte 2&#10;Texte 3&#10;..."
                    value={batchTexts}
                    onChange={(e) => setBatchTexts(e.target.value)}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {batchTexts.split('\n').filter(t => t.trim()).length} texte(s) à analyser
                  </p>
                </div>

                <button
                  onClick={analyzeBatch}
                  disabled={loading || !batchTexts.trim()}
                  className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Analyse en cours...
                    </span>
                  ) : (
                    '🔍 Analyser Tous les Textes'
                  )}
                </button>

                {/* Error Display */}
                {error && (
                  <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    ❌ {error}
                  </div>
                )}

                {/* Batch Results */}
                {batchResults.length > 0 && (
                  <div className="mt-6">
                    {renderBatchStatistics()}

                    <div className="mt-6">
                      <h3 className="text-xl font-bold mb-4 text-gray-800">📋 Résultats Détaillés</h3>
                      <div className="space-y-3">
                        {batchResults.map((result, index) => (
                          <div
                            key={index}
                            className="bg-white rounded-lg p-4 shadow hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-sm font-semibold text-gray-500">#{index + 1}</span>
                                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getSentimentBadgeColor(result.prediction)}`}>
                                    {getSentimentIcon(result.prediction)} {result.prediction}
                                  </span>
                                </div>
                                <p className="text-gray-700 text-sm">{result.input}</p>
                              </div>
                              {result.probabilities && (
                                <div className="ml-4 text-right">
                                  <p className="text-xs text-gray-500 mb-1">Confiance</p>
                                  <p className="text-lg font-bold" style={{ color: SENTIMENT_COLORS[result.prediction.toLowerCase()] }}>
                                    {(Math.max(...Object.values(result.probabilities)) * 100).toFixed(1)}%
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-600 text-sm">
          <p>Propulsé par Machine Learning & NLP 🤖</p>
          <p className="mt-1">Développé avec React & Flask</p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default SentimentAnalyzer;
