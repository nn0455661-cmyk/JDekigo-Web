"use client";

import { Fragment } from "react";
import { parseInlineRubyText, repairMojibakeText } from "@/utils/grammarQuestionBuilder";

const HIGHLIGHT_TEXT_STYLE = { color: "#dc2626", fontWeight: 600, textDecoration: "underline" };
const HIGHLIGHT_RT_STYLE = { color: "#dc2626", fontWeight: 600 };

function getQuoteMatch(text, startIndex) {
    const opening = text[startIndex];
    const closing = { '"': '"', "'": "'", "“": "”", "‘": "’", "「": "」", "『": "』" }[opening];

    if (!closing) {
        return null;
    }

    const endIndex = text.indexOf(closing, startIndex + 1);
    if (endIndex === -1) {
        return null;
    }

    return {
        opening,
        closing,
        content: text.slice(startIndex + 1, endIndex),
        endIndex,
    };
}

function renderQuotedPlainText(text, highlightQuotedText, quotedTextClassName) {
    const nodes = [];
    let index = 0;

    while (index < text.length) {
        const quote = getQuoteMatch(text, index);

        if (!quote) {
            nodes.push(<Fragment key={`plain-${index}`}>{text[index]}</Fragment>);
            index += 1;
            continue;
        }

        const shouldHighlight = highlightQuotedText;
        const className = shouldHighlight ? quotedTextClassName : "";
        const style = shouldHighlight ? HIGHLIGHT_TEXT_STYLE : undefined;

        if (index > 0 && nodes.length === 0) {
            nodes.push(<Fragment key={`plain-before-${index}`}>{text.slice(0, index)}</Fragment>);
        }

        nodes.push(
            <span key={`quote-${index}`} className={className} style={style}>
                {shouldHighlight ? "" : quote.opening}
                <span style={style}>{quote.content}</span>
                {shouldHighlight ? "" : quote.closing}
            </span>
        );

        index = quote.endIndex + 1;
    }

    if (nodes.length === 0) {
        return <Fragment>{text}</Fragment>;
    }

    return nodes;
}

function renderParsedSegments(text, rtClassName, highlightQuotedText, quotedTextClassName, showFurigana) {
    const segments = parseInlineRubyText(text);

    return segments.map((segment, index) => {
        if (!segment.reading) {
            return highlightQuotedText ? (
                <Fragment key={`${segment.text}-${index}`}>
                    {renderQuotedPlainText(segment.text, highlightQuotedText, quotedTextClassName)}
                </Fragment>
            ) : (
                <Fragment key={`${segment.text}-${index}`}>{segment.text}</Fragment>
            );
        }

        const isQuoted = Boolean(segment.prefix || segment.suffix);
        const shouldHighlight = highlightQuotedText && isQuoted;
        const className = shouldHighlight ? quotedTextClassName : "";
        const style = shouldHighlight ? HIGHLIGHT_TEXT_STYLE : undefined;
        const rtStyle = shouldHighlight ? HIGHLIGHT_RT_STYLE : undefined;
        const openingQuote = shouldHighlight ? "" : (segment.prefix || "");
        const closingQuote = shouldHighlight ? "" : (segment.suffix || "");

        if (!showFurigana) {
            return (
                <span key={`${segment.text}-${index}`} className={className} style={style}>
                    {openingQuote}
                    <span style={style}>{segment.text}</span>
                    {closingQuote}
                </span>
            );
        }

        return (
            <Fragment key={`${segment.text}-${index}`}>
                {openingQuote}
                <ruby className={`${className} whitespace-pre-line align-baseline leading-none`} style={{ rubyPosition: "over" }}>
                    <rb style={style}>{segment.text}</rb>
                    <rt className={`${rtClassName} leading-none`} style={{ ...rtStyle, paddingBottom: "0.15em" }}>
                        {segment.reading}
                    </rt>
                </ruby>
                {closingQuote}
            </Fragment>
        );
    });
}

export default function RubyText({
    text,
    reading,
    className = "",
    rtClassName = "",
    highlightQuotedText = false,
    quotedTextClassName = "text-red-600",
    showFurigana = true,
}) {
    const baseText = repairMojibakeText(text);
    const baseReading = String(reading || "").trim();
    const hasInlineRuby = parseInlineRubyText(baseText).some((segment) => Boolean(segment.reading));

    if (hasInlineRuby) {
        return (
            <span className={className}>
                {renderParsedSegments(baseText, rtClassName, highlightQuotedText, quotedTextClassName, showFurigana)}
            </span>
        );
    }

    if (!baseReading) {
        return (
            <span className={className}>
                {highlightQuotedText ? renderQuotedPlainText(baseText, highlightQuotedText, quotedTextClassName) : baseText}
            </span>
        );
    }

    if (!showFurigana) {
        return <span className={className}>{baseText}</span>;
    }

    return (
        <ruby className={`${className} whitespace-pre-line align-baseline leading-none`} style={{ rubyPosition: "over" }}>
            <rb>{baseText}</rb>
            <rt className={`${rtClassName} leading-none`} style={{ paddingBottom: "0.15em" }}>{baseReading}</rt>
        </ruby>
    );
}
