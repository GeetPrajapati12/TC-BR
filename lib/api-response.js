import { NextResponse } from "next/server"

export function ok(data, status = 200) {
  return NextResponse.json(data, { status })
}

export function created(data) {
  return NextResponse.json(data, { status: 201 })
}

export function badRequest(message) {
  return NextResponse.json({ message }, { status: 400 })
}

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ message }, { status: 401 })
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ message }, { status: 403 })
}

export function notFound(message = "Not found") {
  return NextResponse.json({ message }, { status: 404 })
}

export function conflict(message) {
  return NextResponse.json({ message }, { status: 409 })
}

export function serverError(message = "Internal server error") {
  return NextResponse.json({ message }, { status: 500 })
}

/**
 * Wraps an async route handler, catches known auth errors and
 * unknown errors, logs them, and returns a consistent response.
 */
export function withErrorHandling(handler) {
  return async (request, context) => {
    try {
      return await handler(request, context)
    } catch (error) {
      if (error.status === 401) return unauthorized(error.message)
      if (error.status === 403) return forbidden(error.message)
      if (error.status === 404) return notFound(error.message)
      if (error.code === 11000) return conflict("A record with that value already exists")
      console.error("[API Error]", error)
      return serverError()
    }
  }
}
