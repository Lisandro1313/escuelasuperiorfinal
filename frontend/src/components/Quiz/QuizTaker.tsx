import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

interface Question {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'text' | 'code';
  question: string;
  options?: string[];
  correctAnswer: string | number;
  explanation?: string;
  points: number;
  timeLimit?: number;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  courseId: number;
  questions: Question[];
  timeLimit: number;
  attempts: number;
  passingScore: number;
  isActive: boolean;
  createdBy: number;
  createdAt: Date;
}

interface QuizAttempt {
  id: string;
  quizId: string;
  userId: number;
  answers: { [questionId: string]: string | number };
  score: number;
  maxScore: number;
  timeSpent: number;
  completedAt: Date;
  isCompleted: boolean;
}

interface QuizTakerProps {
  quizId?: string;
  onQuizCompleted?: (attempt: QuizAttempt) => void;
}

const QuizTaker: React.FC<QuizTakerProps> = ({ quizId, onQuizCompleted }) => {
  const { usuario } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [questionId: string]: string | number }>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [questionTimeRemaining, setQuestionTimeRemaining] = useState(0);
  const [isQuizStarted, setIsQuizStarted] = useState(false);
  const [isQuizCompleted, setIsQuizCompleted] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizAttempt | null>(null);
  const [showResults, setShowResults] = useState(false);

  // Quiz de demostración
  const demoQuiz: Quiz = {
    id: '1',
    title: 'Evaluación: Fundamentos de React',
    description: 'Examen sobre conceptos básicos de React, componentes, hooks y manejo de estado.',
    courseId: 1,
    questions: [
      {
        id: '1',
        type: 'multiple-choice',
        question: '¿Qué es JSX en React?',
        options: [
          'Un lenguaje de programación separado',
          'Una extensión de sintaxis de JavaScript',
          'Una biblioteca de CSS',
          'Un framework de backend'
        ],
        correctAnswer: 1,
        explanation: 'JSX es una extensión de sintaxis de JavaScript que permite escribir elementos HTML dentro de JavaScript de forma declarativa.',
        points: 10,
        timeLimit: 60
      },
      {
        id: '2',
        type: 'true-false',
        question: 'Los componentes funcionales en React pueden tener estado usando hooks.',
        correctAnswer: 'true',
        explanation: 'Correcto! Con la introducción de hooks como useState, los componentes funcionales pueden manejar estado local.',
        points: 5,
        timeLimit: 30
      },
      {
        id: '3',
        type: 'multiple-choice',
        question: '¿Cuál es la forma correcta de pasar datos de un componente padre a un hijo?',
        options: [
          'Usando variables globales',
          'A través de props',
          'Usando localStorage',
          'Con cookies'
        ],
        correctAnswer: 1,
        explanation: 'Los props son la forma estándar de pasar datos de componentes padres a hijos en React.',
        points: 10,
        timeLimit: 45
      },
      {
        id: '4',
        type: 'text',
        question: 'Menciona dos hooks básicos de React y explica brevemente su propósito.',
        correctAnswer: 'useState para manejar estado local, useEffect para efectos secundarios',
        explanation: 'useState permite agregar estado local a componentes funcionales, useEffect maneja efectos secundarios como llamadas a APIs.',
        points: 15,
        timeLimit: 120
      },
      {
        id: '5',
        type: 'code',
        question: 'Escribe un componente funcional simple que muestre "Hola Mundo" y reciba una prop llamada "nombre".',
        correctAnswer: 'function Saludo({ nombre }) { return <h1>Hola {nombre}</h1>; }',
        explanation: 'Un componente funcional básico que usa destructuring para recibir props y JSX para renderizar.',
        points: 20,
        timeLimit: 180
      }
    ],
    timeLimit: 15, // 15 minutos
    attempts: 3,
    passingScore: 70,
    isActive: true,
    createdBy: 1,
    createdAt: new Date()
  };

  useEffect(() => {
    // Cargar quiz (aquí se haría una llamada a la API)
    setQuiz(demoQuiz);
  }, [quizId]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    
    if (isQuizStarted && !isQuizCompleted && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            completeQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isQuizStarted, isQuizCompleted, timeRemaining]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    
    if (isQuizStarted && !isQuizCompleted && questionTimeRemaining > 0) {
      interval = setInterval(() => {
        setQuestionTimeRemaining(prev => {
          if (prev <= 1) {
            nextQuestion();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isQuizStarted, isQuizCompleted, questionTimeRemaining, currentQuestionIndex]);

  const startQuiz = () => {
    if (!quiz) return;
    
    setIsQuizStarted(true);
    setTimeRemaining(quiz.timeLimit * 60); // Convertir minutos a segundos
    setQuestionTimeRemaining(quiz.questions[0].timeLimit || 60);
  };

  const selectAnswer = (questionId: string, answer: string | number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const nextQuestion = () => {
    if (!quiz) return;

    if (currentQuestionIndex < quiz.questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setQuestionTimeRemaining(quiz.questions[nextIndex].timeLimit || 60);
    } else {
      completeQuiz();
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      const prevIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIndex);
      setQuestionTimeRemaining(quiz!.questions[prevIndex].timeLimit || 60);
    }
  };

  const completeQuiz = () => {
    if (!quiz || !usuario) return;

    setIsQuizCompleted(true);
    
    // Calcular puntuación
    let totalScore = 0;
    let maxScore = 0;

    quiz.questions.forEach(question => {
      maxScore += question.points;
      const userAnswer = answers[question.id];
      
      if (userAnswer !== undefined) {
        if (question.type === 'multiple-choice' || question.type === 'true-false') {
          if (userAnswer === question.correctAnswer) {
            totalScore += question.points;
          }
        } else if (question.type === 'text' || question.type === 'code') {
          // Para texto libre, asignar puntuación parcial (esto sería manual en la realidad)
          const userAnswerStr = (userAnswer as string).toLowerCase();
          
          if (userAnswerStr.includes('usestate') && userAnswerStr.includes('useeffect')) {
            totalScore += question.points; // Puntuación completa
          } else if (userAnswerStr.includes('usestate') || userAnswerStr.includes('useeffect')) {
            totalScore += Math.floor(question.points * 0.5); // Puntuación parcial
          }
        }
      }
    });

    const attempt: QuizAttempt = {
      id: Date.now().toString(),
      quizId: quiz.id,
      userId: usuario.id,
      answers,
      score: totalScore,
      maxScore,
      timeSpent: (quiz.timeLimit * 60) - timeRemaining,
      completedAt: new Date(),
      isCompleted: true
    };

    setQuizResult(attempt);
    
    if (onQuizCompleted) {
      onQuizCompleted(attempt);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScorePercentage = () => {
    if (!quizResult) return 0;
    return Math.round((quizResult.score / quizResult.maxScore) * 100);
  };

  const getScoreColor = () => {
    const percentage = getScorePercentage();
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 70) return 'text-blue-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const isPassing = () => {
    return quiz && getScorePercentage() >= quiz.passingScore;
  };

  if (!quiz) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando quiz...</p>
        </div>
      </div>
    );
  }

  if (isQuizCompleted && showResults) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className={`text-6xl mb-4 ${isPassing() ? '🎉' : '😔'}`}>
              {isPassing() ? '🎉' : '😔'}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Quiz Completado
            </h1>
            <p className="text-gray-600">
              {isPassing() ? '¡Felicitaciones! Has aprobado el quiz.' : 'No has alcanzado la puntuación mínima.'}
            </p>
          </div>

          {quizResult && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <h3 className="text-sm font-medium text-blue-600 mb-1">Puntuación</h3>
                <p className={`text-2xl font-bold ${getScoreColor()}`}>
                  {quizResult.score}/{quizResult.maxScore}
                </p>
              </div>

              <div className="bg-green-50 rounded-lg p-4 text-center">
                <h3 className="text-sm font-medium text-green-600 mb-1">Porcentaje</h3>
                <p className={`text-2xl font-bold ${getScoreColor()}`}>
                  {getScorePercentage()}%
                </p>
              </div>

              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <h3 className="text-sm font-medium text-purple-600 mb-1">Tiempo</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {formatTime(quizResult.timeSpent)}
                </p>
              </div>

              <div className={`${isPassing() ? 'bg-green-50' : 'bg-red-50'} rounded-lg p-4 text-center`}>
                <h3 className={`text-sm font-medium ${isPassing() ? 'text-green-600' : 'text-red-600'} mb-1`}>
                  Estado
                </h3>
                <p className={`text-lg font-bold ${isPassing() ? 'text-green-600' : 'text-red-600'}`}>
                  {isPassing() ? 'APROBADO' : 'REPROBADO'}
                </p>
              </div>
            </div>
          )}

          {/* Revisión de respuestas */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Revisión de Respuestas</h2>
            
            {quiz.questions.map((question, index) => {
              const userAnswer = answers[question.id];
              const isCorrect = userAnswer === question.correctAnswer;

              return (
                <div key={question.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 flex-1">
                      {index + 1}. {question.question}
                    </h3>
                    <div className="flex items-center space-x-2 ml-4">
                      {isCorrect ? (
                        <span className="bg-green-100 text-green-800 text-sm font-medium px-2 py-1 rounded">
                          ✅ Correcto (+{question.points} pts)
                        </span>
                      ) : (
                        <span className="bg-red-100 text-red-800 text-sm font-medium px-2 py-1 rounded">
                          ❌ Incorrecto (0 pts)
                        </span>
                      )}
                    </div>
                  </div>

                  {question.type === 'multiple-choice' && question.options && (
                    <div className="space-y-2 mb-4">
                      {question.options.map((option, optIndex) => {
                        const isUserAnswer = userAnswer === optIndex;
                        const isCorrectAnswer = question.correctAnswer === optIndex;

                        return (
                          <div
                            key={optIndex}
                            className={`p-2 rounded ${
                              isCorrectAnswer
                                ? 'bg-green-100 border border-green-300'
                                : isUserAnswer
                                ? 'bg-red-100 border border-red-300'
                                : 'bg-gray-50'
                            }`}
                          >
                            <span className="text-sm">
                              {String.fromCharCode(65 + optIndex)}. {option}
                              {isCorrectAnswer && ' ✅'}
                              {isUserAnswer && !isCorrectAnswer && ' ❌ Tu respuesta'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {question.type === 'true-false' && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600">
                        Tu respuesta: <span className={userAnswer === question.correctAnswer ? 'text-green-600' : 'text-red-600'}>
                          {userAnswer === 'true' ? 'Verdadero' : 'Falso'}
                        </span>
                      </p>
                      <p className="text-sm text-green-600">
                        Respuesta correcta: {question.correctAnswer === 'true' ? 'Verdadero' : 'Falso'}
                      </p>
                    </div>
                  )}

                  {(question.type === 'text' || question.type === 'code') && (
                    <div className="mb-4 space-y-2">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Tu respuesta:</p>
                        <div className={`p-2 rounded border ${
                          question.type === 'code' ? 'font-mono text-sm bg-gray-50' : 'bg-gray-50'
                        }`}>
                          {userAnswer || 'Sin respuesta'}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-green-700">Respuesta modelo:</p>
                        <div className={`p-2 rounded border bg-green-50 border-green-200 ${
                          question.type === 'code' ? 'font-mono text-sm' : ''
                        }`}>
                          {question.correctAnswer}
                        </div>
                      </div>
                    </div>
                  )}

                  {question.explanation && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                      <p className="text-sm text-blue-800">
                        <strong>Explicación:</strong> {question.explanation}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-center space-x-4 mt-8">
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition duration-200"
            >
              🔄 Intentar de Nuevo
            </button>
            
            <button
              onClick={() => window.history.back()}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg transition duration-200"
            >
              ← Volver al Curso
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isQuizCompleted) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">⏱️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            ¡Quiz Completado!
          </h1>
          <p className="text-gray-600 mb-6">
            Tu quiz ha sido enviado y está siendo calificado.
          </p>
          
          <button
            onClick={() => setShowResults(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition duration-200"
          >
            📊 Ver Resultados
          </button>
        </div>
      </div>
    );
  }

  if (!isQuizStarted) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{quiz.title}</h1>
          <p className="text-gray-600 mb-6">{quiz.description}</p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-1">⏱️ Tiempo Límite</h3>
              <p className="text-blue-700">{quiz.timeLimit} minutos</p>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-medium text-green-900 mb-1">📊 Preguntas</h3>
              <p className="text-green-700">{quiz.questions.length} preguntas</p>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <h3 className="font-medium text-purple-900 mb-1">🎯 Puntuación Mínima</h3>
              <p className="text-purple-700">{quiz.passingScore}% para aprobar</p>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <h3 className="font-medium text-orange-900 mb-1">🔄 Intentos</h3>
              <p className="text-orange-700">{quiz.attempts} máximo</p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-yellow-800 mb-2">📋 Instrucciones:</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Lee cada pregunta cuidadosamente</li>
              <li>• Algunas preguntas tienen tiempo límite individual</li>
              <li>• Puedes navegar entre preguntas usando los botones</li>
              <li>• El quiz se enviará automáticamente al terminar el tiempo</li>
              <li>• Asegúrate de tener una conexión estable a internet</li>
            </ul>
          </div>

          <button
            onClick={startQuiz}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-medium transition duration-200"
          >
            🚀 Comenzar Quiz
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header con información del quiz */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{quiz.title}</h1>
            <p className="text-sm text-gray-600">
              Pregunta {currentQuestionIndex + 1} de {quiz.questions.length}
            </p>
          </div>

          <div className="flex items-center space-x-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Tiempo restante</p>
              <p className={`text-lg font-bold ${timeRemaining < 300 ? 'text-red-600' : 'text-blue-600'}`}>
                ⏰ {formatTime(timeRemaining)}
              </p>
            </div>

            {currentQuestion.timeLimit && (
              <div className="text-center">
                <p className="text-sm text-gray-600">Pregunta</p>
                <p className={`text-lg font-bold ${questionTimeRemaining < 10 ? 'text-red-600' : 'text-orange-600'}`}>
                  ⏱️ {formatTime(questionTimeRemaining)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Pregunta actual */}
      <div className="bg-white rounded-lg shadow-md p-8 mb-6">
        <div className="flex items-start justify-between mb-6">
          <h2 className="text-2xl font-medium text-gray-900 flex-1 mr-4">
            {currentQuestion.question}
          </h2>
          <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
            {currentQuestion.points} pts
          </span>
        </div>

        {/* Opciones de respuesta según el tipo */}
        {currentQuestion.type === 'multiple-choice' && currentQuestion.options && (
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => (
              <label
                key={index}
                className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition duration-200 ${
                  answers[currentQuestion.id] === index
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  type="radio"
                  name={currentQuestion.id}
                  value={index}
                  checked={answers[currentQuestion.id] === index}
                  onChange={() => selectAnswer(currentQuestion.id, index)}
                  className="text-blue-600"
                />
                <span className="text-gray-900">
                  <strong>{String.fromCharCode(65 + index)}.</strong> {option}
                </span>
              </label>
            ))}
          </div>
        )}

        {currentQuestion.type === 'true-false' && (
          <div className="space-y-3">
            <label
              className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition duration-200 ${
                answers[currentQuestion.id] === 'true'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                type="radio"
                name={currentQuestion.id}
                value="true"
                checked={answers[currentQuestion.id] === 'true'}
                onChange={() => selectAnswer(currentQuestion.id, 'true')}
                className="text-green-600"
              />
              <span className="text-gray-900 font-medium">✅ Verdadero</span>
            </label>

            <label
              className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition duration-200 ${
                answers[currentQuestion.id] === 'false'
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                type="radio"
                name={currentQuestion.id}
                value="false"
                checked={answers[currentQuestion.id] === 'false'}
                onChange={() => selectAnswer(currentQuestion.id, 'false')}
                className="text-red-600"
              />
              <span className="text-gray-900 font-medium">❌ Falso</span>
            </label>
          </div>
        )}

        {(currentQuestion.type === 'text' || currentQuestion.type === 'code') && (
          <div>
            <textarea
              value={answers[currentQuestion.id] as string || ''}
              onChange={(e) => selectAnswer(currentQuestion.id, e.target.value)}
              placeholder={
                currentQuestion.type === 'code'
                  ? 'Escribe tu código aquí...'
                  : 'Escribe tu respuesta aquí...'
              }
              className={`w-full h-32 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                currentQuestion.type === 'code' ? 'font-mono text-sm' : ''
              }`}
            />
            {currentQuestion.type === 'code' && (
              <p className="text-sm text-gray-500 mt-2">
                💡 Tip: Escribe código limpio y comenta las partes importantes
              </p>
            )}
          </div>
        )}
      </div>

      {/* Navegación */}
      <div className="flex items-center justify-between">
        <button
          onClick={previousQuestion}
          disabled={currentQuestionIndex === 0}
          className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 text-gray-700 px-4 py-2 rounded-lg transition duration-200"
        >
          <span>←</span>
          <span>Anterior</span>
        </button>

        <div className="flex items-center space-x-4">
          {/* Indicadores de preguntas */}
          <div className="flex space-x-1">
            {quiz.questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-8 h-8 rounded-full text-sm font-medium transition duration-200 ${
                  index === currentQuestionIndex
                    ? 'bg-blue-600 text-white'
                    : answers[quiz.questions[index].id] !== undefined
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-gray-100 text-gray-600 border border-gray-300'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>

        {currentQuestionIndex === quiz.questions.length - 1 ? (
          <button
            onClick={completeQuiz}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition duration-200"
          >
            <span>✅</span>
            <span>Terminar Quiz</span>
          </button>
        ) : (
          <button
            onClick={nextQuestion}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200"
          >
            <span>Siguiente</span>
            <span>→</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default QuizTaker;