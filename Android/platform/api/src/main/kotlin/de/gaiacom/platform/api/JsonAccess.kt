// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.api

import java.time.DateTimeException
import java.time.Instant
import java.util.Collections
import java.util.LinkedHashMap

internal fun JsonNode.requireObject(): JsonObject = this as? JsonObject ?: throw JsonSyntaxException()
internal fun JsonNode.requireArray(): JsonArray = this as? JsonArray ?: throw JsonSyntaxException()

internal fun JsonObject.requiredString(
    vararg aliases: String,
    minimumLength: Int = 1,
    maximumLength: Int,
): String {
    val value = selected(*aliases) as? JsonString ?: throw JsonSyntaxException()
    if (value.value.length !in minimumLength..maximumLength || value.value.hasForbiddenTextControl()) {
        throw JsonSyntaxException()
    }
    return value.value
}

internal fun JsonObject.displayString(
    vararg aliases: String,
    maximumLength: Int,
    default: String = "",
): String {
    val selected = selectedOptional(*aliases) ?: return default
    val value = (selected as? JsonString)?.value ?: return default
    return if (value.length <= maximumLength && !value.hasForbiddenTextControl()) value else default
}

internal fun JsonObject.requiredSingleLine(
    vararg aliases: String,
    maximumLength: Int,
): String {
    val value = requiredString(*aliases, maximumLength = maximumLength)
    if (value.any(Char::isISOControl)) throw JsonSyntaxException()
    return value
}

internal fun JsonObject.optionalSingleLine(
    vararg aliases: String,
    maximumLength: Int,
): String? {
    val value = optionalString(*aliases, maximumLength = maximumLength) ?: return null
    if (value.any(Char::isISOControl)) throw JsonSyntaxException()
    return value
}

internal fun JsonObject.optionalString(
    vararg aliases: String,
    maximumLength: Int,
): String? {
    val selected = selectedOptional(*aliases) ?: return null
    if (selected === JsonNull) return null
    val value = (selected as? JsonString)?.value ?: throw JsonSyntaxException()
    if (value.length > maximumLength || value.hasForbiddenTextControl()) throw JsonSyntaxException()
    return value
}

internal fun JsonObject.requiredBoolean(vararg aliases: String): Boolean =
    (selected(*aliases) as? JsonBoolean)?.value ?: throw JsonSyntaxException()

internal fun JsonObject.optionalBoolean(default: Boolean, vararg aliases: String): Boolean {
    val selected = selectedOptional(*aliases) ?: return default
    return (selected as? JsonBoolean)?.value ?: throw JsonSyntaxException()
}

internal fun JsonObject.requiredLong(range: LongRange, vararg aliases: String): Long {
    val literal = (selected(*aliases) as? JsonNumber)?.literal ?: throw JsonSyntaxException()
    val value = literal.toLongOrNull() ?: throw JsonSyntaxException()
    if (value !in range) throw JsonSyntaxException()
    return value
}

internal fun JsonObject.optionalInt(default: Int, range: IntRange, vararg aliases: String): Int {
    val selected = selectedOptional(*aliases) ?: return default
    val literal = (selected as? JsonNumber)?.literal ?: throw JsonSyntaxException()
    val value = literal.toIntOrNull() ?: throw JsonSyntaxException()
    if (value !in range) throw JsonSyntaxException()
    return value
}

internal fun JsonObject.requiredArray(vararg aliases: String): JsonArray =
    selected(*aliases) as? JsonArray ?: throw JsonSyntaxException()

internal fun JsonObject.optionalArray(vararg aliases: String): JsonArray? {
    val selected = selectedOptional(*aliases) ?: return null
    if (selected === JsonNull) return null
    return selected as? JsonArray ?: throw JsonSyntaxException()
}

internal fun JsonObject.requiredObject(vararg aliases: String): JsonObject =
    selected(*aliases) as? JsonObject ?: throw JsonSyntaxException()

internal fun JsonObject.optionalObject(vararg aliases: String): JsonObject? {
    val selected = selectedOptional(*aliases) ?: return null
    if (selected === JsonNull) return null
    return selected as? JsonObject ?: throw JsonSyntaxException()
}

internal fun JsonObject.requiredDocument(vararg aliases: String): JsonDocument {
    val node = selected(*aliases)
    if (node === JsonNull) throw JsonSyntaxException()
    return StrictJson.document(node)
}

internal fun JsonObject.optionalDocument(vararg aliases: String): JsonDocument? {
    val node = selectedOptional(*aliases) ?: return null
    if (node === JsonNull) return null
    return StrictJson.document(node)
}

internal fun JsonObject.requiredInstant(vararg aliases: String): Instant =
    parseInstant(requiredString(*aliases, maximumLength = 64))

internal fun JsonObject.optionalInstant(vararg aliases: String): Instant? {
    val value = optionalString(*aliases, maximumLength = 64) ?: return null
    if (value.isEmpty()) return null
    return parseInstant(value)
}

internal fun JsonObject.stringList(maximumEntries: Int, vararg aliases: String): List<String> {
    val array = optionalArray(*aliases) ?: return emptyList()
    if (array.values.size > maximumEntries) throw JsonSyntaxException()
    val values = array.values.map { node ->
        val value = (node as? JsonString)?.value ?: throw JsonSyntaxException()
        if (value.length !in 1..64 || value.hasForbiddenTextControl()) throw JsonSyntaxException()
        value
    }
    return Collections.unmodifiableList(ArrayList(values))
}

internal fun JsonObject.intMap(maximumEntries: Int, vararg aliases: String): Map<String, Int> {
    val source = optionalObject(*aliases) ?: return emptyMap()
    if (source.fields.size > maximumEntries) throw JsonSyntaxException()
    val result = LinkedHashMap<String, Int>()
    source.fields.forEach { (key, node) ->
        if (key.length !in 1..32 || key.hasForbiddenTextControl()) throw JsonSyntaxException()
        val value = (node as? JsonNumber)?.literal?.toIntOrNull() ?: throw JsonSyntaxException()
        if (value !in 0..1_000_000) throw JsonSyntaxException()
        result[key] = value
    }
    return Collections.unmodifiableMap(result)
}

internal fun JsonObject.booleanMap(maximumEntries: Int, vararg aliases: String): Map<String, Boolean> {
    val source = optionalObject(*aliases) ?: return emptyMap()
    if (source.fields.size > maximumEntries) throw JsonSyntaxException()
    val result = LinkedHashMap<String, Boolean>()
    source.fields.forEach { (key, node) ->
        if (key.length !in 1..32 || key.hasForbiddenTextControl()) throw JsonSyntaxException()
        result[key] = (node as? JsonBoolean)?.value ?: throw JsonSyntaxException()
    }
    return Collections.unmodifiableMap(result)
}

private fun JsonObject.selected(vararg aliases: String): JsonNode =
    selectedOptional(*aliases) ?: throw JsonSyntaxException()

private fun JsonObject.selectedOptional(vararg aliases: String): JsonNode? {
    if (aliases.isEmpty()) throw JsonSyntaxException()
    val matches = aliases.mapNotNull { alias -> fields[alias] }
    if (matches.size > 1) throw JsonSyntaxException()
    return matches.singleOrNull()
}

private fun parseInstant(value: String): Instant = try {
    Instant.parse(value)
} catch (_: DateTimeException) {
    throw JsonSyntaxException()
}

private fun String.hasForbiddenTextControl(): Boolean =
    any { character -> character.isISOControl() && character !in ALLOWED_TEXT_CONTROLS }

private val ALLOWED_TEXT_CONTROLS = setOf('\n', '\r', '\t')
