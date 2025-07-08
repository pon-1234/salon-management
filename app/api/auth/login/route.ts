import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

// パスワードのハッシュ化と比較を行うライブラリを後で導入する
// import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const customer = await db.customer.findUnique({
      where: { email },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, customer.password);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // 環境変数からJWTのシークレットキーを取得する
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET is not defined in environment variables');
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    // JWTを生成
    const token = jwt.sign(
      { customerId: customer.id, name: customer.name },
      jwtSecret,
      { expiresIn: '1h' } // トークンの有効期限
    );

    // Cookieにトークンをセット
    const response = NextResponse.json({ message: 'Login successful' });
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60, // 1時間
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 