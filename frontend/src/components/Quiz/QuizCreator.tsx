import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface Question {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'text' | 'code';
  question: string;
  options?: string[];
  correctAnswer: string | number;
  explanation?: string;
  points: number;
  timeLimit?: number; // en segundos
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  courseId: number;
  questions: Question[];
  timeLimit: number; // en minutos
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

interface QuizCreatorProps {
  courseId?: number;
  onQuizCreated?: (quiz: Quiz) => void;
}

const QuizCreator: React.FC<QuizCreatorProps> = ({ courseId, onQuizCreated }) => {
  const { usuario } = useAuth();
  const [quiz, setQuiz] = useState<Partial<Quiz>>({
    title: '',
    description: '',
    courseId: courseId || 1,
    questions: [],
    timeLimit: 30,
    attempts: 3,
    passingScore: 70,
    isActive: true,
    createdBy: usuario?.id
  });

  const [currentQuestion, setCurrentQuestion] = useState<Partial<Question>>({
    type: 'multiple-choice',
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    explanation: '',
    points: 10,
    timeLimit: 60
  });

  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const questionTypes = [
    { value: 'multiple-choice', label: 'Opción Múltiple', icon: '📝' },
    { value: 'true-false', label: 'Verdadero/Falso', icon: '✅' },
    { value: 'text', label: 'Texto Libre', icon: '📄' },
    { value: 'code', label: 'Código', icon: '💻' }
  ];

  const addQuestion = () => {
    if (!currentQuestion.question?.trim()) return;

    const newQuestion: Question = {
      id: Date.now().toString(),
      type: currentQuestion.type as Question['type'],
      question: currentQuestion.question,
      options: currentQuestion.type === 'multiple-choice' ? currentQuestion.options : undefined,
      correctAnswer: currentQuestion.correctAnswer!,
      explanation: currentQuestion.explanation,
      points: currentQuestion.points || 10,
      timeLimit: currentQuestion.timeLimit
    };

    if (editingQuestionIndex !== null) {
      const updatedQuestions = [...(quiz.questions || [])];
      updatedQuestions[editingQuestionIndex] = newQuestion;
      setQuiz(prev => ({ ...prev, questions: updatedQuestions }));
      setEditingQuestionIndex(null);
    } else {
      setQuiz(prev => ({
        ...prev,
        questions: [...(prev.questions || []), newQuestion]
      }));
    }

    // Reset form
    setCurrentQuestion({
      type: 'multiple-choice',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: '',
      points: 10,
      timeLimit: 60
    });
  };

  const editQuestion = (index: number) => {
    const question = quiz.questions![index];
    setCurrentQuestion(question);
    setEditingQuestionIndex(index);
  };

  const deleteQuestion = (index: number) => {
    const updatedQuestions = quiz.questions!.filter((_, i) => i !== index);
    setQuiz(prev => ({ ...prev, questions: updatedQuestions }));
  };

  const saveQuiz = async () => {
    if (!quiz.title?.trim() || !quiz.questions?.length) {
      alert('Por favor completa el título y agrega al menos una pregunta');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/quizzes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: quiz.title,
          description: quiz.description || '',
          courseId: quiz.courseId,
          timeLimit: quiz.timeLimit,
          attemptsAllowed: quiz.attempts,
          passingScore: quiz.passingScore,
          questions: quiz.questions.map(q => ({
            question: q.question,
            type: q.type,
            options: q.options,
            correctAnswer: q.correctAnswer,
            points: q.points,
            explanation: q.explanation
          }))
        })
      });

      if (response.ok) {
        const createdQuiz = await response.json();
        alert('Quiz creado exitosamente');
        
        // Llamar callback si existe
        if (onQuizCreated) {
          onQuizCreated(createdQuiz);
        }
        
        // Resetear formulario
        setQuiz({
          title: '',
          description: '',
          courseId: courseId || 1,
          questions: [],
          timeLimit: 30,
          attempts: 3,
          passingScore: 70,
          isActive: true,
          createdBy: usuario?.id
        });
      } else {
        const error = await response.json();
        alert(`Error al crear quiz: ${error.error}`);
      }
    } catch (error) {
      console.error('Error al crear quiz:', error);
      alert('Error de conexión al crear el quiz');
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...(currentQuestion.options || ['', '', '', ''])];
    newOptions[index] = value;
    setCurrentQuestion(prev => ({ ...prev, options: newOptions }));
  };

  const renderQuestionForm = () => {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {editingQuestionIndex !== null ? 'Editar Pregunta' : 'Nueva Pregunta'}
        </h3>

        {/* Tipo de pregunta */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Pregunta
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {questionTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setCurrentQuestion(prev => ({ 
                  ...prev, 
                  type: type.value as Question['type'],
                  options: type.value === 'multiple-choice' ? ['', '', '', ''] : undefined,
                  correctAnswer: type.value === 'true-false' ? 'true' : 0
                }))}
                className={`p-3 rounded-lg border text-sm font-medium transition duration-200 ${
                  currentQuestion.type === type.value
                    ? 'bg-blue-100 border-blue-500 text-blue-700'
                    : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="block text-lg mb-1">{type.icon}</span>
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pregunta */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pregunta *
          </label>
          <textarea
            value={currentQuestion.question || ''}
            onChange={(e) => setCurrentQuestion(prev => ({ ...prev, question: e.target.value }))}
            placeholder="Escribe tu pregunta aquí..."
            className="w-full h-24 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Opciones para múltiple elección */}
        {currentQuestion.type === 'multiple-choice' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Opciones de Respuesta
            </label>
            <div className="space-y-2">
              {currentQuestion.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="correctAnswer"
                    checked={currentQuestion.correctAnswer === index}
                    onChange={() => setCurrentQuestion(prev => ({ ...prev, correctAnswer: index }))}
                    className="text-blue-600"
                  />
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Opción ${index + 1}`}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-500 w-20">
                    {currentQuestion.correctAnswer === index && '✅ Correcta'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Verdadero/Falso */}
        {currentQuestion.type === 'true-false' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Respuesta Correcta
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="truefalse"
                  value="true"
                  checked={currentQuestion.correctAnswer === 'true'}
                  onChange={() => setCurrentQuestion(prev => ({ ...prev, correctAnswer: 'true' }))}
                  className="mr-2 text-blue-600"
                />
                ✅ Verdadero
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="truefalse"
                  value="false"
                  checked={currentQuestion.correctAnswer === 'false'}
                  onChange={() => setCurrentQuestion(prev => ({ ...prev, correctAnswer: 'false' }))}
                  className="mr-2 text-blue-600"
                />
                ❌ Falso
              </label>
            </div>
          </div>
        )}

        {/* Respuesta para texto libre o código */}
        {(currentQuestion.type === 'text' || currentQuestion.type === 'code') && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Respuesta Modelo {currentQuestion.type === 'code' ? '(Código)' : '(Texto)'}
            </label>
            <textarea
              value={currentQuestion.correctAnswer as string || ''}
              onChange={(e) => setCurrentQuestion(prev => ({ ...prev, correctAnswer: e.target.value }))}
              placeholder={currentQuestion.type === 'code' 
                ? 'Código de respuesta esperado...' 
                : 'Respuesta modelo o palabras clave...'
              }
              className={`w-full h-24 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                currentQuestion.type === 'code' ? 'font-mono text-sm' : ''
              }`}
            />
          </div>
        )}

        {/* Configuración adicional */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Puntos
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={currentQuestion.points || 10}
              onChange={(e) => setCurrentQuestion(prev => ({ ...prev, points: parseInt(e.target.value) }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tiempo Límite (seg)
            </label>
            <input
              type="number"
              min="10"
              max="300"
              value={currentQuestion.timeLimit || 60}
              onChange={(e) => setCurrentQuestion(prev => ({ ...prev, timeLimit: parseInt(e.target.value) }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={addQuestion}
              disabled={!currentQuestion.question?.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-md transition duration-200"
            >
              {editingQuestionIndex !== null ? 'Actualizar' : 'Agregar'} Pregunta
            </button>
          </div>
        </div>

        {/* Explicación */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Explicación (Opcional)
          </label>
          <textarea
            value={currentQuestion.explanation || ''}
            onChange={(e) => setCurrentQuestion(prev => ({ ...prev, explanation: e.target.value }))}
            placeholder="Explicación que se mostrará después de responder..."
            className="w-full h-20 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Crear Quiz</h1>
          <p className="text-gray-600 mt-2">
            Diseña evaluaciones interactivas para tus estudiantes
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition duration-200"
          >
            {showPreview ? '📝 Editar' : '👀 Vista Previa'}
          </button>
          
          <button
            onClick={saveQuiz}
            disabled={!quiz.title?.trim() || !quiz.questions?.length}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg transition duration-200"
          >
            💾 Guardar Quiz
          </button>
        </div>
      </div>

      {!showPreview ? (
        <>
          {/* Configuración general del quiz */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Configuración General</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título del Quiz *
                </label>
                <input
                  type="text"
                  value={quiz.title || ''}
                  onChange={(e) => setQuiz(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ej: Examen Final - Introducción a React"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Curso ID
                </label>
                <input
                  type="number"
                  value={quiz.courseId || ''}
                  onChange={(e) => setQuiz(prev => ({ ...prev, courseId: parseInt(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={quiz.description || ''}
                  onChange={(e) => setQuiz(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descripción del quiz y objetivos de aprendizaje..."
                  className="w-full h-24 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tiempo Límite (minutos)
                </label>
                <input
                  type="number"
                  min="5"
                  max="180"
                  value={quiz.timeLimit || 30}
                  onChange={(e) => setQuiz(prev => ({ ...prev, timeLimit: parseInt(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Intentos Permitidos
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={quiz.attempts || 3}
                  onChange={(e) => setQuiz(prev => ({ ...prev, attempts: parseInt(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Puntuación Mínima (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={quiz.passingScore || 70}
                  onChange={(e) => setQuiz(prev => ({ ...prev, passingScore: parseInt(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={quiz.isActive}
                  onChange={(e) => setQuiz(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="mr-2 text-blue-600"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Quiz Activo (visible para estudiantes)
                </label>
              </div>
            </div>
          </div>

          {/* Formulario para agregar preguntas */}
          {renderQuestionForm()}

          {/* Lista de preguntas agregadas */}
          {quiz.questions && quiz.questions.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Preguntas del Quiz ({quiz.questions.length})
              </h3>

              <div className="space-y-4">
                {quiz.questions.map((question, index) => (
                  <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                            {questionTypes.find(t => t.value === question.type)?.icon} {questionTypes.find(t => t.value === question.type)?.label}
                          </span>
                          <span className="text-sm text-gray-500">
                            {question.points} pts | {question.timeLimit}s
                          </span>
                        </div>
                        
                        <h4 className="text-md font-medium text-gray-900 mb-2">
                          {index + 1}. {question.question}
                        </h4>

                        {question.type === 'multiple-choice' && question.options && (
                          <div className="ml-4 space-y-1">
                            {question.options.map((option, optIndex) => (
                              <div key={optIndex} className={`text-sm ${
                                question.correctAnswer === optIndex 
                                  ? 'text-green-600 font-medium' 
                                  : 'text-gray-600'
                              }`}>
                                {String.fromCharCode(65 + optIndex)}. {option}
                                {question.correctAnswer === optIndex && ' ✅'}
                              </div>
                            ))}
                          </div>
                        )}

                        {question.type === 'true-false' && (
                          <div className="ml-4 text-sm text-green-600 font-medium">
                            Respuesta: {question.correctAnswer === 'true' ? '✅ Verdadero' : '❌ Falso'}
                          </div>
                        )}

                        {(question.type === 'text' || question.type === 'code') && (
                          <div className="ml-4 text-sm text-gray-600">
                            <strong>Respuesta modelo:</strong> {question.correctAnswer}
                          </div>
                        )}
                      </div>

                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => editQuestion(index)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => deleteQuestion(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Total de preguntas: {quiz.questions.length}</span>
                  <span>Puntuación total: {quiz.questions.reduce((sum, q) => sum + q.points, 0)} pts</span>
                  <span>Tiempo estimado: {Math.ceil(quiz.questions.reduce((sum, q) => sum + (q.timeLimit || 60), 0) / 60)} min</span>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Vista previa del quiz */
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{quiz.title || 'Sin título'}</h2>
          <p className="text-gray-600 mb-4">{quiz.description || 'Sin descripción'}</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
            <div className="bg-blue-50 p-3 rounded-lg">
              <span className="text-blue-600 font-medium">⏱️ Tiempo límite</span>
              <p className="text-gray-900">{quiz.timeLimit} minutos</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <span className="text-green-600 font-medium">🎯 Puntuación mínima</span>
              <p className="text-gray-900">{quiz.passingScore}%</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <span className="text-purple-600 font-medium">🔄 Intentos</span>
              <p className="text-gray-900">{quiz.attempts} máximo</p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <span className="text-orange-600 font-medium">📊 Preguntas</span>
              <p className="text-gray-900">{quiz.questions?.length || 0} total</p>
            </div>
          </div>

          {quiz.questions && quiz.questions.length > 0 ? (
            <div className="space-y-6">
              {quiz.questions.map((question, index) => (
                <div key={question.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Pregunta {index + 1}
                    </h3>
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                      {question.points} pts
                    </span>
                  </div>
                  
                  <p className="text-gray-800 mb-4">{question.question}</p>

                  {question.type === 'multiple-choice' && question.options && (
                    <div className="space-y-2">
                      {question.options.map((option, optIndex) => (
                        <label key={optIndex} className="flex items-center space-x-2 cursor-pointer">
                          <input type="radio" name={`preview-${question.id}`} className="text-blue-600" />
                          <span className="text-gray-700">{String.fromCharCode(65 + optIndex)}. {option}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {question.type === 'true-false' && (
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="radio" name={`preview-${question.id}`} className="text-blue-600" />
                        <span className="text-gray-700">Verdadero</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="radio" name={`preview-${question.id}`} className="text-blue-600" />
                        <span className="text-gray-700">Falso</span>
                      </label>
                    </div>
                  )}

                  {(question.type === 'text' || question.type === 'code') && (
                    <textarea
                      placeholder={question.type === 'code' ? 'Escribe tu código aquí...' : 'Escribe tu respuesta aquí...'}
                      className={`w-full h-24 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        question.type === 'code' ? 'font-mono text-sm' : ''
                      }`}
                      disabled
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <span className="text-4xl mb-4 block">📝</span>
              <p>No hay preguntas agregadas aún</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuizCreator;