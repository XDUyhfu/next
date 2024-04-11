import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { User } from '@/app/lib/definitions';
import bcrypt from 'bcrypt';

// 根据邮箱查询用户的信息
async function getUser(email: string) {
  try {
    const users = await sql<User>`SELECT * FROM users WHERE email=${email}`;
    return users.rows[0];
  } catch (error) {
    console.log(error);
    throw new Error('获取用户信息失败');
  }
}

export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        // 验证用户凭证
        const parsedCredentials = z
          .object({
            email: z.string().email(),
            password: z.string().min(6),
          })
          .safeParse(credentials);
        // 表单验证成功，获取数据库中的用户信息
        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          const user = await getUser(email);
          if (!user) return null;
          const passwordsMath = await bcrypt.compare(password, user.password);
          if (passwordsMath) return user;
          console.log('用户验证失败');
        }
        // 密码匹配，返回用户信息
        return null;
      },
    }),
  ],
});
