package httpx

import (
	"context"
	"net/http"
	"strings"
)

type contextKey string

const paramsContextKey contextKey = "gaiacom.httpx.params"

type HandlerFunc func(http.ResponseWriter, *http.Request)
type Middleware func(HandlerFunc) HandlerFunc

type Router struct {
	routes      []route
	middleware []Middleware
	notFound   HandlerFunc
}

type route struct {
	method   string
	pattern  string
	segments []segment
	handler  HandlerFunc
}

type segment struct {
	value string
	param bool
}

type Params map[string]string

func NewRouter() *Router {
	return &Router{
		notFound: func(w http.ResponseWriter, _ *http.Request) {
			WriteError(w, http.StatusNotFound, "Not Found")
		},
	}
}

func (r *Router) Use(middleware ...Middleware) {
	r.middleware = append(r.middleware, middleware...)
}

func (r *Router) Handle(method string, pattern string, handler HandlerFunc) {
	r.routes = append(r.routes, route{
		method:   method,
		pattern:  pattern,
		segments: parsePattern(pattern),
		handler:  handler,
	})
}

func (r *Router) GET(pattern string, handler HandlerFunc) {
	r.Handle(http.MethodGet, pattern, handler)
}

func (r *Router) POST(pattern string, handler HandlerFunc) {
	r.Handle(http.MethodPost, pattern, handler)
}

func (r *Router) PUT(pattern string, handler HandlerFunc) {
	r.Handle(http.MethodPut, pattern, handler)
}

func (r *Router) DELETE(pattern string, handler HandlerFunc) {
	r.Handle(http.MethodDelete, pattern, handler)
}

func (r *Router) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	pathSegments := splitPath(req.URL.Path)
	for _, candidate := range r.routes {
		if candidate.method != req.Method {
			continue
		}
		params, ok := candidate.match(pathSegments)
		if !ok {
			continue
		}

		handler := r.chain(candidate.handler)
		ctx := context.WithValue(req.Context(), paramsContextKey, params)
		handler(w, req.WithContext(ctx))
		return
	}

	r.chain(r.notFound)(w, req)
}

func Param(req *http.Request, name string) string {
	params, ok := req.Context().Value(paramsContextKey).(Params)
	if !ok {
		return ""
	}
	return params[name]
}

func (r *Router) chain(handler HandlerFunc) HandlerFunc {
	wrapped := handler
	for i := len(r.middleware) - 1; i >= 0; i-- {
		wrapped = r.middleware[i](wrapped)
	}
	return wrapped
}

func (r route) match(pathSegments []string) (Params, bool) {
	if len(r.segments) != len(pathSegments) {
		return nil, false
	}

	params := make(Params)
	for index, expected := range r.segments {
		actual := pathSegments[index]
		if expected.param {
			if actual == "" {
				return nil, false
			}
			params[expected.value] = actual
			continue
		}
		if expected.value != actual {
			return nil, false
		}
	}

	return params, true
}

func parsePattern(pattern string) []segment {
	parts := splitPath(pattern)
	result := make([]segment, 0, len(parts))
	for _, part := range parts {
		if strings.HasPrefix(part, ":") && len(part) > 1 {
			result = append(result, segment{value: part[1:], param: true})
			continue
		}
		result = append(result, segment{value: part})
	}
	return result
}

func splitPath(path string) []string {
	trimmed := strings.Trim(path, "/")
	if trimmed == "" {
		return nil
	}
	return strings.Split(trimmed, "/")
}
