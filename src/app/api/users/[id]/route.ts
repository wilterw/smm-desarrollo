import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(
  req: NextRequest, 
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  
  if (!session || session.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, email, password, role, maxFacebookAccounts, maxInstagramAccounts, maxYouTubeAccounts } = body;
    
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });
    
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    if (existingUser.role === "SUPER_ADMIN" && role && role !== "SUPER_ADMIN") {
      const superAdminsCount = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
      if (superAdminsCount <= 1) {
        return NextResponse.json({ error: "Cannot downgrade the last Super Admin" }, { status: 400 });
      }
    }

    const dataToUpdate: any = { name, role };
    if (email) dataToUpdate.email = email.toLowerCase();
    if (password) dataToUpdate.password = await bcrypt.hash(password, 10);
    
    if (maxFacebookAccounts !== undefined) dataToUpdate.maxFacebookAccounts = maxFacebookAccounts;
    if (maxInstagramAccounts !== undefined) dataToUpdate.maxInstagramAccounts = maxInstagramAccounts;
    if (maxYouTubeAccounts !== undefined) dataToUpdate.maxYouTubeAccounts = maxYouTubeAccounts;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: { id: true, name: true, email: true, role: true }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest, 
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  
  if (!session || session.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.id === id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { id } });
    
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    if (existingUser.role === "SUPER_ADMIN") {
      const superAdminsCount = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
      if (superAdminsCount <= 1) {
        return NextResponse.json({ error: "Cannot delete the last Super Admin" }, { status: 400 });
      }
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
