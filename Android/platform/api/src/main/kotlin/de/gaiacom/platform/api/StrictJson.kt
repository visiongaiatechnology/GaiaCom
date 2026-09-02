// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.api

import java.nio.ByteBuffer
import java.nio.charset.CharacterCodingException
import java.nio.charset.CodingErrorAction
import java.nio.charset.StandardCharsets
import java.util.Collections
import java.util.LinkedHashMap

internal sealed interface JsonNode

internal data class JsonObject(val fields: Map<String, JsonNode>) : JsonNode
internal data class JsonArray(val values: List<JsonNode>) : JsonNode
internal data class JsonString(val value: String) : JsonNode
internal data class JsonNumber(val literal: String) : JsonNode
internal data class JsonBoolean(val value: Boolean) : JsonNode
internal data object JsonNull : JsonNode

internal class JsonSyntaxException : IllegalArgumentException("JSON violates the strict decoder contract")

internal object StrictJson {
    fun parse(bytes: ByteArray): JsonNode {
        if (bytes.isEmpty() || bytes.size > MAX_INPUT_BYTES) throw JsonSyntaxException()
        val source = try {
            StandardCharsets.UTF_8.newDecoder()
                .onMalformedInput(CodingErrorAction.REPORT)
                .onUnmappableCharacter(CodingErrorAction.REPORT)
                .decode(ByteBuffer.wrap(bytes))
                .toString()
        } catch (_: CharacterCodingException) {
            throw JsonSyntaxException()
        }
        return Parser(source).parse()
    }

    fun document(node: JsonNode): JsonDocument {
        val output = StringBuilder()
        writeCanonical(node, output)
        return JsonDocument(output.toString())
    }

    private fun writeCanonical(node: JsonNode, output: StringBuilder) {
        when (node) {
            is JsonObject -> {
                output.append('{')
                node.fields.entries.forEachIndexed { index, entry ->
                    if (index > 0) output.append(',')
                    writeString(entry.key, output)
                    output.append(':')
                    writeCanonical(entry.value, output)
                }
                output.append('}')
            }
            is JsonArray -> {
                output.append('[')
                node.values.forEachIndexed { index, value ->
                    if (index > 0) output.append(',')
                    writeCanonical(value, output)
                }
                output.append(']')
            }
            is JsonString -> writeString(node.value, output)
            is JsonNumber -> output.append(node.literal)
            is JsonBoolean -> output.append(if (node.value) "true" else "false")
            JsonNull -> output.append("null")
        }
        if (output.length > MAX_DOCUMENT_CHARS) throw JsonSyntaxException()
    }

    private fun writeString(value: String, output: StringBuilder) {
        output.append('"')
        value.forEach { character ->
            when (character) {
                '"' -> output.append("\\\"")
                '\\' -> output.append("\\\\")
                '\b' -> output.append("\\b")
                '\u000C' -> output.append("\\f")
                '\n' -> output.append("\\n")
                '\r' -> output.append("\\r")
                '\t' -> output.append("\\t")
                else -> if (character.code < 0x20) {
                    output.append("\\u")
                    output.append(character.code.toString(16).padStart(4, '0'))
                } else {
                    output.append(character)
                }
            }
        }
        output.append('"')
    }

    private class Parser(private val source: String) {
        private var index = 0
        private var nodes = 0

        fun parse(): JsonNode {
            skipWhitespace()
            val value = parseValue(0)
            skipWhitespace()
            if (index != source.length) throw JsonSyntaxException()
            return value
        }

        private fun parseValue(depth: Int): JsonNode {
            nodes += 1
            if (nodes > MAX_NODES || index >= source.length) throw JsonSyntaxException()
            return when (source[index]) {
                '{' -> parseObject(depth)
                '[' -> parseArray(depth)
                '"' -> JsonString(parseString())
                't' -> parseLiteral("true", JsonBoolean(true))
                'f' -> parseLiteral("false", JsonBoolean(false))
                'n' -> parseLiteral("null", JsonNull)
                '-', in '0'..'9' -> JsonNumber(parseNumber())
                else -> throw JsonSyntaxException()
            }
        }

        private fun parseObject(depth: Int): JsonObject {
            if (depth >= MAX_DEPTH) throw JsonSyntaxException()
            index += 1
            skipWhitespace()
            val fields = LinkedHashMap<String, JsonNode>()
            if (consume('}')) return JsonObject(Collections.unmodifiableMap(fields))
            while (true) {
                if (fields.size >= MAX_COLLECTION_ENTRIES || !peek('"')) throw JsonSyntaxException()
                val key = parseString()
                if (fields.containsKey(key)) throw JsonSyntaxException()
                skipWhitespace()
                requireCharacter(':')
                skipWhitespace()
                fields[key] = parseValue(depth + 1)
                skipWhitespace()
                if (consume('}')) break
                requireCharacter(',')
                skipWhitespace()
            }
            return JsonObject(Collections.unmodifiableMap(fields))
        }

        private fun parseArray(depth: Int): JsonArray {
            if (depth >= MAX_DEPTH) throw JsonSyntaxException()
            index += 1
            skipWhitespace()
            val values = ArrayList<JsonNode>()
            if (consume(']')) return JsonArray(Collections.unmodifiableList(values))
            while (true) {
                if (values.size >= MAX_COLLECTION_ENTRIES) throw JsonSyntaxException()
                values += parseValue(depth + 1)
                skipWhitespace()
                if (consume(']')) break
                requireCharacter(',')
                skipWhitespace()
            }
            return JsonArray(Collections.unmodifiableList(values))
        }

        private fun parseString(): String {
            requireCharacter('"')
            val output = StringBuilder()
            while (index < source.length) {
                val character = source[index++]
                when {
                    character == '"' -> return output.toString()
                    character == '\\' -> appendEscape(output)
                    character.code < 0x20 -> throw JsonSyntaxException()
                    character.isHighSurrogate() -> {
                        if (index >= source.length || !source[index].isLowSurrogate()) throw JsonSyntaxException()
                        output.append(character)
                        output.append(source[index++])
                    }
                    character.isLowSurrogate() -> throw JsonSyntaxException()
                    else -> output.append(character)
                }
                if (output.length > MAX_STRING_CHARS) throw JsonSyntaxException()
            }
            throw JsonSyntaxException()
        }

        private fun appendEscape(output: StringBuilder) {
            if (index >= source.length) throw JsonSyntaxException()
            when (val escaped = source[index++]) {
                '"', '\\', '/' -> output.append(escaped)
                'b' -> output.append('\b')
                'f' -> output.append('\u000C')
                'n' -> output.append('\n')
                'r' -> output.append('\r')
                't' -> output.append('\t')
                'u' -> appendUnicodeEscape(output)
                else -> throw JsonSyntaxException()
            }
        }

        private fun appendUnicodeEscape(output: StringBuilder) {
            val first = readHexCodeUnit()
            when {
                first.isHighSurrogate() -> {
                    if (index + 2 > source.length || source[index] != '\\' || source[index + 1] != 'u') {
                        throw JsonSyntaxException()
                    }
                    index += 2
                    val second = readHexCodeUnit()
                    if (!second.isLowSurrogate()) throw JsonSyntaxException()
                    output.append(first)
                    output.append(second)
                }
                first.isLowSurrogate() -> throw JsonSyntaxException()
                else -> output.append(first)
            }
        }

        private fun readHexCodeUnit(): Char {
            if (index + 4 > source.length) throw JsonSyntaxException()
            var value = 0
            repeat(4) {
                val digit = source[index++].digitToIntOrNull(16) ?: throw JsonSyntaxException()
                value = (value shl 4) or digit
            }
            return value.toChar()
        }

        private fun parseNumber(): String {
            val start = index
            consume('-')
            if (consume('0')) {
                if (index < source.length && source[index].isDigit()) throw JsonSyntaxException()
            } else {
                requireDigits()
            }
            if (consume('.')) requireDigits()
            if (index < source.length && (source[index] == 'e' || source[index] == 'E')) {
                index += 1
                if (index < source.length && (source[index] == '+' || source[index] == '-')) index += 1
                requireDigits()
            }
            return source.substring(start, index)
        }

        private fun requireDigits() {
            val start = index
            while (index < source.length && source[index].isDigit()) index += 1
            if (start == index) throw JsonSyntaxException()
        }

        private fun <T : JsonNode> parseLiteral(literal: String, value: T): T {
            if (!source.regionMatches(index, literal, 0, literal.length)) throw JsonSyntaxException()
            index += literal.length
            return value
        }

        private fun requireCharacter(expected: Char) {
            if (!consume(expected)) throw JsonSyntaxException()
        }

        private fun consume(expected: Char): Boolean {
            if (index >= source.length || source[index] != expected) return false
            index += 1
            return true
        }

        private fun peek(expected: Char): Boolean = index < source.length && source[index] == expected

        private fun skipWhitespace() {
            while (index < source.length && source[index] in JSON_WHITESPACE) index += 1
        }
    }

    private const val MAX_INPUT_BYTES = 4 * 1_024 * 1_024
    private const val MAX_DOCUMENT_CHARS = 1_048_576
    private const val MAX_STRING_CHARS = 1_048_576
    private const val MAX_NODES = 100_000
    private const val MAX_DEPTH = 32
    private const val MAX_COLLECTION_ENTRIES = 2_000
    private val JSON_WHITESPACE = setOf(' ', '\t', '\r', '\n')
}
