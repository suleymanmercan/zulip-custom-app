import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/stores/authStore';
import { Button, Input } from '@/components/ui';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const registerSchema = z.object({
  email: z.string().email('Geçerli bir email giriniz'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalı'),
  inviteCode: z.string().min(1, 'Davet kodu zorunludur'),
  zulipEmail: z.string().email('Geçerli bir Zulip email giriniz'),
  zulipToken: z.string().min(1, 'Zulip API token zorunludur'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export const RegisterForm = () => {
  const registerUser = useAuthStore((state) => state.register);
  const isLoading = useAuthStore((state) => state.isLoading);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser(data);
      toast.success('Kayıt başarılı! Giriş yapabilirsiniz.');
      navigate('/login');
    } catch (error) {
      toast.error('Kayıt başarısız. Lütfen tekrar deneyin.');
    }
  };

  return (
    <div className="w-full max-w-lg bg-white p-8 rounded-2xl shadow-xl border border-gray-100 my-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Kayıt Ol</h1>
        <p className="text-gray-500 mt-2">Yeni bir hesap oluşturun</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="col-span-1 md:col-span-2">
                <Input
                label="Davet Kodu"
                placeholder="Size verilen özel kod"
                error={errors.inviteCode?.message}
                {...register('inviteCode')}
                />
            </div>

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
        </div>

        <div className="border-t border-gray-100 pt-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Zulip Bağlantısı</h3>
            <div className="space-y-4">
                <Input
                label="Zulip Email"
                type="email"
                placeholder="zulip@sirket.com"
                error={errors.zulipEmail?.message}
                {...register('zulipEmail')}
                />
                
                <Input
                label="Zulip API Token"
                type="password"
                placeholder="Zulip > Settings > Personal API Key"
                error={errors.zulipToken?.message}
                {...register('zulipToken')}
                />
            </div>
            <p className="text-xs text-gray-500 mt-2">
                Token'ınız güvenli bir şekilde şifrelenerek saklanacaktır.
            </p>
        </div>

        <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
          Hesap Oluştur
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-600">
        Zaten hesabınız var mı?{' '}
        <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
          Giriş Yap
        </Link>
      </div>
    </div>
  );
};
