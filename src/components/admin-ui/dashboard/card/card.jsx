'use client'

import Image from 'next/image'
import Button from '../button/button'
import Link from 'next/link'
import { FaEye } from 'react-icons/fa'

function Card({ style, lastProject }) {
  return (
    <div
      style={style}
      className="bg-bgSoft rounded-[10px] p-6 border border-primary/20 hover:border-primary/40 transition-all duration-300"
    >
      <h1 className="mb-5 text-2xl font-light text-white border-b border-grey/20 pb-3">Latest Project</h1>

      <div className="flex items-center space-x-6">
        <div className="relative rounded-lg overflow-hidden shadow-lg">
          <Image
            className="border border-grey/20"
            src={`${lastProject.img || '/placeholder.png'}?v=${lastProject.updatedAt || lastProject.updated_at}`}
            alt=""
            width={270}
            height={100}
            style={{ display: 'block', verticalAlign: 'top' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-lg"></div>
        </div>
        <div className="flex-1 w-full">
          <h3 className="mb-3 text-xl font-semibold text-white">{lastProject.title}</h3>
          <div className="flex flex-col justify-between w-full space-y-2">
            <div className="flex justify-between items-center p-2 bg-background/50 rounded">
              <span className="text-grey">Status:</span>
              <span className={`px-2 py-1 rounded text-sm font-medium ${
                lastProject.status === 'Live' 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-primary/20 text-primary border border-primary/30'
              }`}>
                {lastProject.status}
              </span>
            </div>
            <div className="flex justify-between items-center p-2 bg-background/50 rounded">
              <span className="text-grey">Created:</span>
              <span className="text-white font-mono text-sm">{lastProject.createdAt?.toString().slice(0, 10) || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-background/50 rounded">
              <span className="text-grey">Updated:</span>
              <span className="text-white font-mono text-sm">{lastProject.updatedAt?.toString().slice(0, 10) || 'N/A'}</span>
            </div>

            <div className="flex justify-center mt-6 pt-4 border-t border-grey/20">
              <Link
                href={`/admin/projects/${lastProject._id}`}
                className="flex items-center px-6 py-2 bg-primary/20 text-primary rounded hover:bg-primary/30 transition-colors border border-primary/30"
              >
                <FaEye className="mr-2" /> View Project
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Card
