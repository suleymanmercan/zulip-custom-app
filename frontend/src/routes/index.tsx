import { createBrowserRouter } from 'react-router-dom';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ChatPage } from '@/pages/ChatPage';
import { ProtectedRoute } from './ProtectedRoute';
import { Navigate } from 'react-router-dom';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <Navigate to="/chat" replace />,
      },
      {
        path: '/chat',
        element: <ChatPage />,
      },
      {
        path: '/chat/:streamId',
        element: <ChatPage />,
      },
      {
        path: '/chat/:streamId/:topic',
        element: <ChatPage />,
      },
    ],
  },
  {
    path: '*',
    element: <div>404 Not Found</div>,
  },
]);
