import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

interface ForumPost {
  id: number;
  title: string;
  content: string;
  author: {
    id: number;
    name: string;
    role: 'student' | 'instructor' | 'admin';
    avatar?: string;
  };
  courseId: number;
  courseName: string;
  category: 'general' | 'homework' | 'technical' | 'announcements' | 'qa';
  tags: string[];
  replies: ForumReply[];
  views: number;
  upvotes: number;
  downvotes: number;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ForumReply {
  id: number;
  content: string;
  author: {
    id: number;
    name: string;
    role: 'student' | 'instructor' | 'admin';
    avatar?: string;
  };
  postId: number;
  parentReplyId?: number;
  upvotes: number;
  downvotes: number;
  isAccepted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ForumProps {
  courseId?: number;
  category?: string;
}

const Forum: React.FC<ForumProps> = ({ courseId, category }) => {
  const { usuario } = useAuth();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<ForumPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(category || 'all');
  const [selectedCourse, setSelectedCourse] = useState<number>(courseId || 0);
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'replies'>('recent');
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: 'general' as ForumPost['category'],
    tags: [] as string[],
    courseId: courseId || 1
  });

  const categories = [
    { id: 'all', name: 'Todas las categorías', icon: '📋', color: 'gray' },
    { id: 'general', name: 'General', icon: '💬', color: 'blue' },
    { id: 'homework', name: 'Tareas', icon: '📝', color: 'green' },
    { id: 'technical', name: 'Técnico', icon: '🔧', color: 'purple' },
    { id: 'announcements', name: 'Anuncios', icon: '📢', color: 'yellow' },
    { id: 'qa', name: 'Preguntas y Respuestas', icon: '❓', color: 'red' }
  ];

  const courses = [
    { id: 0, name: 'Todos los cursos' },
    { id: 1, name: 'Desarrollo Web Frontend' },
    { id: 2, name: 'JavaScript Avanzado' },
    { id: 3, name: 'Node.js Backend' },
    { id: 4, name: 'React y TypeScript' },
    { id: 5, name: 'Bases de Datos' }
  ];

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    filterPosts();
  }, [posts, searchTerm, selectedCategory, selectedCourse, sortBy]);

  const loadPosts = async () => {
    setIsLoading(true);
    try {
      // Por ahora iniciamos con array vacío, más tarde implementaremos API
      setPosts([]);
      
      // TODO: Implementar API para cargar posts del foro
      // const response = await fetch('/api/forum/posts', {
      //   headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      // });
      // if (response.ok) {
      //   const data = await response.json();
      //   setPosts(data);
      // }
    } catch (error) {
      console.error('Error al cargar posts del foro:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterPosts = () => {
    let filtered = [...posts];

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filtrar por categoría
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(post => post.category === selectedCategory);
    }

    // Filtrar por curso
    if (selectedCourse !== 0) {
      filtered = filtered.filter(post => post.courseId === selectedCourse);
    }

    // Ordenar
    switch (sortBy) {
      case 'popular':
        filtered.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
        break;
      case 'replies':
        filtered.sort((a, b) => b.replies.length - a.replies.length);
        break;
      case 'recent':
      default:
        filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
    }

    // Poner posts pinados al principio
    const pinnedPosts = filtered.filter(post => post.isPinned);
    const regularPosts = filtered.filter(post => !post.isPinned);
    
    setFilteredPosts([...pinnedPosts, ...regularPosts]);
  };

  const createPost = async () => {
    if (!newPost.title.trim() || !newPost.content.trim()) {
      alert('El título y contenido son obligatorios');
      return;
    }

    const post: ForumPost = {
      id: Date.now(),
      title: newPost.title,
      content: newPost.content,
      author: {
        id: usuario?.id || 1,
        name: usuario?.nombre || 'Usuario',
        role: usuario?.tipo === 'profesor' ? 'instructor' : 'student'
      },
      courseId: newPost.courseId,
      courseName: courses.find(c => c.id === newPost.courseId)?.name || 'Curso',
      category: newPost.category,
      tags: newPost.tags,
      replies: [],
      views: 0,
      upvotes: 0,
      downvotes: 0,
      isPinned: false,
      isLocked: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setPosts(prev => [post, ...prev]);
    setShowNewPostModal(false);
    setNewPost({
      title: '',
      content: '',
      category: 'general',
      tags: [],
      courseId: courseId || 1
    });
  };

  const addTag = (tag: string) => {
    if (tag.trim() && !newPost.tags.includes(tag.trim())) {
      setNewPost(prev => ({ ...prev, tags: [...prev.tags, tag.trim()] }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setNewPost(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }));
  };

  const votePost = (postId: number, type: 'up' | 'down') => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          upvotes: type === 'up' ? post.upvotes + 1 : post.upvotes,
          downvotes: type === 'down' ? post.downvotes + 1 : post.downvotes
        };
      }
      return post;
    }));
  };

  const getCategoryInfo = (categoryId: string) => {
    return categories.find(cat => cat.id === categoryId) || categories[0];
  };

  const getTimeDifference = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `hace ${days} día${days > 1 ? 's' : ''}`;
    if (hours > 0) return `hace ${hours} hora${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    return 'hace un momento';
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'instructor': return 'text-purple-600 bg-purple-100';
      case 'admin': return 'text-red-600 bg-red-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'instructor': return 'Instructor';
      case 'admin': return 'Admin';
      default: return 'Estudiante';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando foros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Foros de Discusión 💬</h1>
            <p className="text-gray-600 mt-2">
              Conecta con estudiantes e instructores, comparte conocimientos y resuelve dudas
            </p>
          </div>
          
          <button
            onClick={() => setShowNewPostModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition duration-200 flex items-center space-x-2"
          >
            <span>✍️</span>
            <span>Nuevo Post</span>
          </button>
        </div>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Búsqueda */}
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Buscar en foros..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Categoría */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Curso */}
          <div>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Ordenamiento */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setSortBy('recent')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition duration-200 ${
                sortBy === 'recent'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              🕐 Recientes
            </button>
            <button
              onClick={() => setSortBy('popular')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition duration-200 ${
                sortBy === 'popular'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              🔥 Populares
            </button>
            <button
              onClick={() => setSortBy('replies')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition duration-200 ${
                sortBy === 'replies'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              💬 Más Discusión
            </button>
          </div>

          <span className="text-sm text-gray-500">
            {filteredPosts.length} post{filteredPosts.length !== 1 ? 's' : ''} encontrado{filteredPosts.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Lista de Posts */}
      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay posts disponibles
            </h3>
            <p className="text-gray-600">
              {searchTerm || selectedCategory !== 'all' || selectedCourse !== 0
                ? 'No se encontraron posts con los filtros aplicados'
                : 'Sé el primero en crear un post en este foro'
              }
            </p>
          </div>
        ) : (
          filteredPosts.map((post) => {
            const categoryInfo = getCategoryInfo(post.category);
            
            return (
              <div
                key={post.id}
                className={`bg-white rounded-lg shadow hover:shadow-lg transition duration-200 p-6 ${
                  post.isPinned ? 'border-l-4 border-yellow-400' : ''
                } ${post.isLocked ? 'opacity-75' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header del post */}
                    <div className="flex items-center space-x-3 mb-3">
                      {post.isPinned && (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                          📌 Fijado
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${categoryInfo.color}-100 text-${categoryInfo.color}-800`}>
                        {categoryInfo.icon} {categoryInfo.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {post.courseName}
                      </span>
                      {post.isLocked && (
                        <span className="text-gray-400">🔒</span>
                      )}
                    </div>

                    {/* Título */}
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-blue-600 cursor-pointer">
                      {post.title}
                    </h3>

                    {/* Contenido (preview) */}
                    <p className="text-gray-600 mb-3 line-clamp-2">
                      {post.content.length > 150
                        ? `${post.content.substring(0, 150)}...`
                        : post.content
                      }
                    </p>

                    {/* Tags */}
                    {post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {post.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Footer del post */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {/* Autor */}
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{post.author.avatar || '👤'}</span>
                          <span className="text-sm font-medium text-gray-900">
                            {post.author.name}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(post.author.role)}`}>
                            {getRoleLabel(post.author.role)}
                          </span>
                        </div>

                        {/* Tiempo */}
                        <span className="text-xs text-gray-500">
                          {getTimeDifference(post.updatedAt)}
                        </span>
                      </div>

                      {/* Estadísticas */}
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center space-x-1">
                          <span>👁️</span>
                          <span>{post.views}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <span>💬</span>
                          <span>{post.replies.length}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <span>👍</span>
                          <span>{post.upvotes - post.downvotes}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="ml-6 flex flex-col space-y-2">
                    <button
                      onClick={() => votePost(post.id, 'up')}
                      className="text-gray-400 hover:text-green-600 transition duration-200"
                      title="Me gusta"
                    >
                      👍
                    </button>
                    <button
                      onClick={() => votePost(post.id, 'down')}
                      className="text-gray-400 hover:text-red-600 transition duration-200"
                      title="No me gusta"
                    >
                      👎
                    </button>
                    <button
                      onClick={() => setSelectedPost(post)}
                      className="text-gray-400 hover:text-blue-600 transition duration-200"
                      title="Ver detalles"
                    >
                      👁️
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Nuevo Post */}
      {showNewPostModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  ✍️ Crear Nuevo Post
                </h2>
                <button
                  onClick={() => setShowNewPostModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); createPost(); }} className="space-y-4">
                {/* Título */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título *
                  </label>
                  <input
                    type="text"
                    value={newPost.title}
                    onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Escribe un título descriptivo..."
                    required
                  />
                </div>

                {/* Categoría y Curso */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categoría
                    </label>
                    <select
                      value={newPost.category}
                      onChange={(e) => setNewPost(prev => ({ ...prev, category: e.target.value as ForumPost['category'] }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {categories.slice(1).map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.icon} {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Curso
                    </label>
                    <select
                      value={newPost.courseId}
                      onChange={(e) => setNewPost(prev => ({ ...prev, courseId: parseInt(e.target.value) }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {courses.slice(1).map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Contenido */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contenido *
                  </label>
                  <textarea
                    value={newPost.content}
                    onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                    rows={6}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe tu pregunta o comentario..."
                    required
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {newPost.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm flex items-center space-x-1"
                      >
                        <span>#{tag}</span>
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Agregar tag (presiona Enter)"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag((e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                </div>

                {/* Botones */}
                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => setShowNewPostModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition duration-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition duration-200"
                  >
                    Publicar Post
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Forum;