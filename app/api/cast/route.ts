/**
 * @design_doc   Not available
 * @related_to   CastRepository, Cast type
 * @known_issues Not available
 */
import { NextRequest, NextResponse } from "next/server";
import { Cast } from "@/lib/cast/types";

// In-memory storage for now
const castMembers: Map<string, Cast> = new Map();

// Seed with test data
castMembers.set("test-id", {
  id: "test-id",
  name: "Test Cast",
  age: 25,
  height: 165,
  bust: "B",
  waist: 58,
  hip: 85,
  isActive: true,
  workStart: "10:00",
  workEnd: "22:00",
  specialDesignationFee: 2000,
  regularDesignationFee: 1000,
  availableOptions: ["option1"],
  panelDesignationRank: 1,
  regularDesignationRank: 1,
  publicProfile: {
    birthDate: "1999-01-01",
    bloodType: "A",
    personality: ["friendly"],
    bodyType: "スレンダー",
    services: ["standard"],
    images: [],
    catchphrase: "Test",
    introduction: "Test introduction",
    manager: "Test Manager",
    shop: "Test Shop",
  },
  createdAt: new Date(),
  updatedAt: new Date(),
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (id) {
    const cast = castMembers.get(id);
    if (!cast) {
      return NextResponse.json({ error: "Cast not found" }, { status: 404 });
    }
    return NextResponse.json(cast);
  }

  return NextResponse.json(Array.from(castMembers.values()));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const id = `cast-${Date.now()}`;
  const now = new Date();

  const newCast: Cast = {
    ...body,
    id,
    createdAt: now,
    updatedAt: now,
    panelDesignationRank: body.panelDesignationRank || 1,
    regularDesignationRank: body.regularDesignationRank || 1,
    publicProfile: body.publicProfile || {
      birthDate: "2000-01-01",
      bloodType: "Unknown",
      personality: [],
      bodyType: "Unknown",
      services: [],
      images: [],
      catchphrase: "",
      introduction: "",
      manager: "",
      shop: "",
    },
  };

  castMembers.set(id, newCast);
  return NextResponse.json(newCast, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  const existingCast = castMembers.get(id);
  if (!existingCast) {
    return NextResponse.json({ error: "Cast not found" }, { status: 404 });
  }

  const updatedCast: Cast = {
    ...existingCast,
    ...updates,
    id,
    createdAt: existingCast.createdAt,
    updatedAt: new Date(),
  };

  castMembers.set(id, updatedCast);
  return NextResponse.json(updatedCast);
}

export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  if (!castMembers.has(id)) {
    return NextResponse.json({ error: "Cast not found" }, { status: 404 });
  }

  castMembers.delete(id);
  return new NextResponse(null, { status: 204 });
}