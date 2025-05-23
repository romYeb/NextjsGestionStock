import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const categories = await prisma.category.findMany()
    return NextResponse.json(categories)
  } catch (error) {
    console.error("Erreur Prisma:", error)
    return NextResponse.json({ error: "Erreur de connexion à Supabase via Prisma" }, { status: 500 })
  }
}
