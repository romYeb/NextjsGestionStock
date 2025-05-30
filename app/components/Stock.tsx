'use client'

import { Product } from '@/type'
import { useUser } from '@clerk/nextjs'
import React, { useEffect, useState, useCallback } from 'react'
import { readProducts, replenishStockWithTransaction } from '../actions'
import { toast } from 'react-toastify'
import Image from 'next/image'
import { getPublicImageUrl } from '@/lib/utils'

const Stock = () => {
  const { user } = useUser()
  const email = user?.primaryEmailAddress?.emailAddress as string
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>("")
  const [quantity, setQuantity] = useState<number>(0)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  const fetchProducts = useCallback(async () => {
    try {
      if (email) {
        const products = await readProducts(email)
        if (products) {
          setProducts(products)
        }
      }
    } catch (error) {
      console.error(error)
    }
  }, [email])

  useEffect(() => {
    if (email) {
      fetchProducts()
    }
  }, [email, fetchProducts])

  const handleProductChange = (productId: string) => {
    const product = products.find((p) => p.id === productId)
    setSelectedProduct(product || null)
    setSelectedProductId(productId)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProductId || quantity <= 0) {
      toast.error("Veuillez sélectionner un article et entrer une quantité valide.")
      return
    }

    try {
      if (email) {
        await replenishStockWithTransaction(selectedProductId, quantity, email)
      }
      toast.success("Le stock a été réapprovisionné avec succès.")
      fetchProducts()
      setSelectedProductId('')
      setQuantity(0)
      setSelectedProduct(null)
      const modal = document.getElementById("my_modal_stock") as HTMLDialogElement
      if (modal) {
        modal.close()
      }
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div>
      <dialog id="my_modal_stock" className="modal">
        <div className="modal-box">
          <form method="dialog">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
          </form>
          <h3 className="font-bold text-lg">Gestion du stock</h3>
          <p className="py-4">Ajoutez des quantités aux articles disponibles dans votre stock.</p>

          <form className='space-y-2' onSubmit={handleSubmit}>
            <label className='block'>Sélectionner un article</label>
            <select
              value={selectedProductId}
              className='select select-bordered w-full'
              required
              onChange={(e) => handleProductChange(e.target.value)}
            >
              <option value="">Sélectionner un article</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} - {product.categoryName}
                </option>
              ))}
            </select>

            {selectedProduct && (
              <div className="flex items-center space-x-4 my-4">
                <Image
                  src={getPublicImageUrl(selectedProduct.imageUrl)}
                  alt={selectedProduct.name}
                  width={80}
                  height={80}
                  className="rounded-lg object-cover"
                />
                <div>
                  <div className="font-semibold">{selectedProduct.name}</div>
                  <div className="text-sm text-gray-500">{selectedProduct.categoryName}</div>
                </div>
              </div>
            )}

            <label className='block'>Quantité à ajouter</label>
            <input
              type="number"
              placeholder='Quantité à ajouter'
              value={quantity}
              required
              onChange={(e) => setQuantity(Number(e.target.value))}
              className='input input-bordered w-full'
            />

            <button type="submit" className='btn btn-primary w-fit'>
              Ajouter au stock
            </button>
          </form>
        </div>
      </dialog>
    </div>
  )
}

export default Stock
