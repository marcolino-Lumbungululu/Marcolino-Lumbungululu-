package com.nexusai.android.ui.gestures

import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.pointerInput
import kotlin.math.abs

/**
 * Reconhecimento de gestos táteis para navegação fluida em conjunto com comandos de voz:
 * - Deslizar para cima: expandir painel de respostas
 * - Deslizar para baixo: recolher painel ou interromper leitura
 * - Deslizar para a esquerda: voltar / fechar ecrã atual
 * - Deslizar para a direita: avançar para o histórico
 * - Duplo toque: ativar/parar microfone
 */
fun Modifier.nexusGestureNavigation(
    enabled: Boolean = true,
    minSwipeDistancePx: Float = 90f,
    onSwipeUp: (() -> Unit)? = null,
    onSwipeDown: (() -> Unit)? = null,
    onSwipeLeft: (() -> Unit)? = null,
    onSwipeRight: (() -> Unit)? = null,
    onDoubleTap: (() -> Unit)? = null
): Modifier {
    if (!enabled) return this

    val withDrag = this.pointerInput(onSwipeUp, onSwipeDown, onSwipeLeft, onSwipeRight) {
        var totalDx = 0f
        var totalDy = 0f
        detectDragGestures(
            onDragStart = {
                totalDx = 0f
                totalDy = 0f
            },
            onDrag = { _, dragAmount ->
                totalDx += dragAmount.x
                totalDy += dragAmount.y
            },
            onDragEnd = {
                val absX = abs(totalDx)
                val absY = abs(totalDy)
                if (absX >= minSwipeDistancePx && absX > absY * 1.35f) {
                    if (totalDx < 0) onSwipeLeft?.invoke() else onSwipeRight?.invoke()
                } else if (absY >= minSwipeDistancePx && absY > absX * 1.35f) {
                    if (totalDy < 0) onSwipeUp?.invoke() else onSwipeDown?.invoke()
                }
            }
        )
    }

    return if (onDoubleTap != null) {
        withDrag.pointerInput(onDoubleTap) {
            detectTapGestures(onDoubleTap = { onDoubleTap() })
        }
    } else {
        withDrag
    }
}
