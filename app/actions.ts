"use server";

import prisma from "@/lib/prisma";
import { FormDataType, OrderItem, Product, ProductOverviewStats, StockSummary, Transaction } from "@/type";
import { Category } from "@prisma/client";

export async function checkAndAddAssociation(email: string, name: string) {
  if (!email) return;
  try {
    const existingAssociation = await prisma.association.findUnique({ where: { email } });
    if (!existingAssociation && name) {
      await prisma.association.create({ data: { email, name } });
    }
  } catch (error) {
    console.error(error);
  }
}

export async function getAssociation(email: string) {
  if (!email) return null;
  try {
    const association = await prisma.association.findUnique({ where: { email } });
    return association;
  } catch (error) {
    console.error(error);
    return null;
  }
}

// Category CRUD

export async function createCategory(name: string, email: string, description?: string) {
  if (!name || !email) return;

  const association = await getAssociation(email);
  if (!association) throw new Error("Aucune association trouvée avec cet email.");

  await prisma.category.create({
    data: {
      name,
      description: description || "",
      associationId: association.id
    }
  });
}

export async function updateCategory(id: string, email: string, name: string, description?: string) {
  if (!id || !email || !name) {
    throw new Error("L'id, l'email et le nom sont requis.");
  }

  const association = await getAssociation(email);
  if (!association) throw new Error("Aucune association trouvée avec cet email.");

  await prisma.category.update({
    where: { id: id, associationId: association.id },
    data: { name, description: description || "" }
  });
}

export async function deleteCategory(id: string, email: string) {
  if (!id || !email) throw new Error("L'id et l'email sont requis.");

  const association = await getAssociation(email);
  if (!association) throw new Error("Aucune association trouvée avec cet email.");

  await prisma.category.delete({
    where: { id: id, associationId: association.id }
  });
}

export async function readCategories(email: string): Promise<Category[] | undefined> {
  if (!email) throw new Error("L'email est requis.");

  const association = await getAssociation(email);
  if (!association) throw new Error("Aucune association trouvée avec cet email.");

  return await prisma.category.findMany({
    where: { associationId: association.id }
  });
}

// Product CRUD

export async function createProduct(formData: FormDataType, email: string) {
  const { name, description, price, imageUrl, categoryId, unit } = formData;
  if (!email || !price || !categoryId || !name) {
    throw new Error("Nom, prix, catégorie et email sont requis.");
  }

  const association = await getAssociation(email);
  if (!association) throw new Error("Aucune association trouvée avec cet email.");

  await prisma.product.create({
    data: {
      name,
      description,
      price: Number(price),
      imageUrl: imageUrl || "",
      unit: unit || "",
      categoryId,
      associationId: association.id
    }
  });
}

export async function updateProduct(formData: FormDataType, email: string) {
  const { id, name, description, price, imageUrl } = formData;
  if (!id || !email || !price || !name) {
    throw new Error("ID, nom, prix et email sont requis.");
  }

  const association = await getAssociation(email);
  if (!association) throw new Error("Aucune association trouvée avec cet email.");

  await prisma.product.update({
    where: { id, associationId: association.id },
    data: { name, description, price: Number(price), imageUrl }
  });
}

export async function deleteProduct(id: string, email: string) {
  if (!id || !email) throw new Error("ID et email sont requis.");

  const association = await getAssociation(email);
  if (!association) throw new Error("Aucune association trouvée avec cet email.");

  await prisma.product.delete({
    where: { id, associationId: association.id }
  });
}

export async function readProducts(email: string): Promise<Product[] | undefined> {
  if (!email) throw new Error("Email requis.");

  const association = await getAssociation(email);
  if (!association) throw new Error("Aucune association trouvée avec cet email.");

  const products = await prisma.product.findMany({
    where: { associationId: association.id },
    include: { category: true }
  });

  return products.map(product => ({
    ...product,
    categoryName: product.category?.name
  }));
}

export async function readProductById(productId: string, email: string): Promise<Product | undefined> {
  if (!email || !productId) throw new Error("Email et ID du produit requis.");

  const association = await getAssociation(email);
  if (!association) throw new Error("Aucune association trouvée avec cet email.");

  const product = await prisma.product.findUnique({
    where: { id: productId, associationId: association.id },
    include: { category: true }
  });

  if (!product) return undefined;

  return {
    ...product,
    categoryName: product.category?.name
  };
}

// Stock

export async function replenishStockWithTransaction(productId: string, quantity: number, email: string) {
  if (!productId || !email || quantity <= 0) {
    throw new Error("ID du produit, email et quantité valide requis.");
  }

  const association = await getAssociation(email);
  if (!association) throw new Error("Aucune association trouvée avec cet email.");

  await prisma.product.update({
    where: { id: productId, associationId: association.id },
    data: { quantity: { increment: quantity } }
  });

  await prisma.transaction.create({
    data: {
      type: "IN",
      quantity,
      productId,
      associationId: association.id
    }
  });
}

export async function deductStockWithTransaction(orderItems: OrderItem[], email: string) {
  if (!email) throw new Error("Email requis.");

  const association = await getAssociation(email);
  if (!association) throw new Error("Aucune association trouvée avec cet email.");

  for (const item of orderItems) {
    const product = await prisma.product.findUnique({ where: { id: item.productId } });

    if (!product || item.quantity <= 0 || product.quantity < item.quantity) {
      throw new Error(`Erreur avec le produit ${item.productId}`);
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const item of orderItems) {
      await tx.product.update({
        where: { id: item.productId, associationId: association.id },
        data: { quantity: { decrement: item.quantity } }
      });

      await tx.transaction.create({
        data: {
          type: "OUT",
          quantity: item.quantity,
          productId: item.productId,
          associationId: association.id
        }
      });
    }
  });

  return { success: true };
}

export async function getTransactions(email: string, limit?: number): Promise<Transaction[]> {
  if (!email) throw new Error("Email requis.");

  const association = await getAssociation(email);
  if (!association) throw new Error("Aucune association trouvée avec cet email.");

  const transactions = await prisma.transaction.findMany({
    where: { associationId: association.id },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      product: {
        include: { category: true }
      }
    }
  });

  return transactions.map(tx => ({
    ...tx,
    categoryName: tx.product.category.name,
    productName: tx.product.name,
    imageUrl: tx.product.imageUrl,
    price: tx.product.price,
    unit: tx.product.unit
  }));
}

// Statistiques

export async function getProductOverviewStats(email: string): Promise<ProductOverviewStats> {
  if (!email) throw new Error("Email requis.");

  const association = await getAssociation(email);
  if (!association) throw new Error("Aucune association trouvée avec cet email.");

  const products = await prisma.product.findMany({
    where: { associationId: association.id },
    include: { category: true }
  });

  const transactions = await prisma.transaction.findMany({ where: { associationId: association.id } });

  const categorySet = new Set(products.map(p => p.category?.name));
  const stockValue = products.reduce((acc, p) => acc + p.price * p.quantity, 0);

  return {
    totalProducts: products.length,
    totalCategories: categorySet.size,
    totalTransactions: transactions.length,
    stockValue
  };
}

export async function getProductCategoryDistribution(email: string) {
  if (!email) throw new Error("Email requis.");

  const association = await getAssociation(email);
  if (!association) throw new Error("Aucune association trouvée avec cet email.");

  const categories = await prisma.category.findMany({
    where: { associationId: association.id },
    include: { products: { select: { id: true } } }
  });

  return categories
    .map(cat => ({ name: cat.name, value: cat.products.length }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

export async function getStockSummary(email: string): Promise<StockSummary> {
  if (!email) throw new Error("Email requis.");

  const association = await getAssociation(email);
  if (!association) throw new Error("Aucune association trouvée avec cet email.");

  const products = await prisma.product.findMany({
    where: { associationId: association.id },
    include: { category: true }
  });

  const inStock = products.filter(p => p.quantity > 5);
  const lowStock = products.filter(p => p.quantity > 0 && p.quantity <= 5);
  const outOfStock = products.filter(p => p.quantity === 0);
  const criticalProducts = products
    .filter(p => p.quantity <= 2)
    .map(p => ({
      ...p,
      categoryName: p.category?.name || ""
    }));

  return {
    inStockCount: inStock.length,
    lowStockCount: lowStock.length,
    outOfStockCount: outOfStock.length,
    criticalProducts
  };
}


