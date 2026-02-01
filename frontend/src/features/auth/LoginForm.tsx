import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/stores/authStore';
import { Button, Input } from '@/components/ui';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const loginSchema = z.object({
  email: z.string().email('Geçerli bir email giriniz'),
  password: z.string().min(1, 'Şifre zorunludur'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginForm = () => {
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data);
      toast.success('Giriş başarılı');
      navigate('/chat');
    } catch (error) {
       toast.error('Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
    }
  };

  return (
    <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Giriş Yap</h1>
        <p className="text-gray-500 mt-2">Zulip Mini UI hesabınıza erişin</p>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Input
          label="Email"
          type="email"
          placeholder="ornek@email.com"
          error={errors.email?.message}
          {...register('email')}
        />
        
        <Input
          label="Şifre"
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />

        <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
          Giriş Yap
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-600">
        Hesabınız yok mu?{' '}
        <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-500">
          Kayıt Ol
        </Link>
      </div>
    </div>
  );
};
